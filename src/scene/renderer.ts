import { initDevice, createCanvas, createLoop } from '@bop/adviz/core'
import { RenderPipelineBuilder, createRenderPassDescriptor, createUniformBuffer, createVertexBuffer, createIndexBuffer, updateBuffer } from '@bop/adviz/renderer'
import { createCircle } from '@bop/adviz/geometry'
import { createShaderModule, wgsl } from '@bop/adviz/shader'
import { color } from '@bop/adviz/math'
import type { SceneObject, Transform } from '../network/types.ts'
import type { SceneStore } from './store.ts'

// ── Shader ────────────────────────────────────────────────────────────────────

const SHADER_SRC = wgsl`
  struct Uniforms {
    model : mat4x4f,
    color : vec4f,
  }
  @group(0) @binding(0) var<uniform> u : Uniforms;

  struct VertOut {
    @builtin(position) pos : vec4f,
    @location(0) col : vec4f,
  }

  @vertex fn vs_main(
    @location(0) position : vec3f,
    @location(1) vColor   : vec4f,
  ) -> VertOut {
    var out : VertOut;
    out.pos = u.model * vec4f(position, 1.0);
    // Multiply vertex color by the per-object uniform color
    out.col = vColor * u.color;
    return out;
  }

  @fragment fn fs_main(in: VertOut) -> @location(0) vec4f {
    return in.col;
  }
`

// Vertex layout: vec3f position (12 bytes) + vec4f color (16 bytes) = stride 28
const VERTEX_STRIDE = 28
const VERTEX_ATTRS = [
  { shaderLocation: 0, offset: 0, format: 'float32x3' as const },
  { shaderLocation: 1, offset: 12, format: 'float32x4' as const },
]

// Uniform buffer size: mat4x4f (64) + vec4f (16) = 80, padded to 96 (multiple of 16)
const UNIFORM_SIZE = 96

type Mesh = { vertexBuffer: GPUBuffer; indexBuffer: GPUBuffer | null; drawCount: number; indexFormat: GPUIndexFormat }

function createQuadMesh(device: GPUDevice): Mesh {
  // Unit quad centered at origin, same vertex layout as adviz primitives
  // (vec3f pos + vec4f white color, stride 28)
  const verts = new Float32Array([
    //  x     y    z    r    g    b    a
    -0.5,  0.5, 0.0, 1.0, 1.0, 1.0, 1.0,
     0.5,  0.5, 0.0, 1.0, 1.0, 1.0, 1.0,
     0.5, -0.5, 0.0, 1.0, 1.0, 1.0, 1.0,
    -0.5, -0.5, 0.0, 1.0, 1.0, 1.0, 1.0,
  ])
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3])
  return {
    vertexBuffer: createVertexBuffer(device, verts, 'quad-vertices'),
    indexBuffer: createIndexBuffer(device, indices, 'quad-indices'),
    drawCount: 6,
    indexFormat: 'uint16',
  }
}

// ── Transform math ────────────────────────────────────────────────────────────

/**
 * Build a column-major 4×4 model matrix for a 2D object.
 *
 * Coordinate space: NDC-like, x ∈ [−1, 1] left→right, y ∈ [−1, 1] bottom→top.
 * The aspect ratio correction is applied to scaleX so objects don't stretch.
 */
function buildModelMatrix(t: Transform, aspectRatio: number): Float32Array {
  const cos = Math.cos(t.rotation)
  const sin = Math.sin(t.rotation)
  const sx = t.scaleX / aspectRatio
  const sy = t.scaleY
  // Column-major layout for WGSL mat4x4f
  return new Float32Array([
    cos * sx,  sin * sx,  0, 0,  // col 0
    -sin * sy, cos * sy,  0, 0,  // col 1
    0,         0,         1, 0,  // col 2
    t.x,       t.y,       0, 1,  // col 3
  ])
}

// ── Per-object GPU state ──────────────────────────────────────────────────────

type RenderObj = {
  type: SceneObject['type']
  uniformBuffer: GPUBuffer
  bindGroup: GPUBindGroup
}

// ── Renderer ──────────────────────────────────────────────────────────────────

export class Renderer {
  private device!: GPUDevice
  private context!: GPUCanvasContext
  private pipeline!: GPURenderPipeline
  private bindGroupLayout!: GPUBindGroupLayout
  private quadMesh!: Mesh
  private circleMesh!: Mesh
  private renderObjs = new Map<string, RenderObj>()
  private format!: GPUTextureFormat
  private aspectRatio = 1

  async init(store: SceneStore): Promise<HTMLCanvasElement> {
    const { device } = await initDevice()
    this.device = device

    const container = document.getElementById('canvas-container')!
    const canvas = createCanvas({ container, autoResize: true })

    this.format = navigator.gpu.getPreferredCanvasFormat()
    this.context = canvas.element.getContext('webgpu')!
    this.context.configure({ device, format: this.format, alphaMode: 'premultiplied' })

    // Track aspect ratio whenever the canvas resizes
    this.aspectRatio = canvas.width / canvas.height
    canvas.onResize((w, h) => {
      this.aspectRatio = w / h
      this.context.configure({ device, format: this.format, alphaMode: 'premultiplied' })
    })

    const shader = createShaderModule(device, SHADER_SRC, 'scene-shader')

    this.bindGroupLayout = device.createBindGroupLayout({
      label: 'scene-bgl',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    })

    this.pipeline = new RenderPipelineBuilder(device)
      .setShaders(shader, shader)
      .setVertexLayout(VERTEX_ATTRS, VERTEX_STRIDE)
      .setBindGroupLayouts([this.bindGroupLayout])
      .setTargetFormat(this.format)
      .build()

    this.quadMesh = createQuadMesh(device)
    this.circleMesh = createCircle(device, 64, 0.5)

    // Build initial GPU state for any objects already in the store
    for (const obj of Object.values(store.scene.objects) as SceneObject[]) {
      this.upsertObject(obj)
    }

    // Subscribe to future store changes
    store.subscribe((op) => {
      switch (op.type) {
        case 'add':
          this.upsertObject(op.object)
          break
        case 'remove':
          this.removeObject(op.id)
          break
        case 'move':
        case 'set_color':
          if (store.scene.objects[op.type === 'move' ? op.id : op.id]) {
            this.upsertObject(store.scene.objects[op.type === 'move' ? op.id : op.id])
          }
          break
        case 'sync':
          // Rebuild all GPU objects after full sync
          for (const id of this.renderObjs.keys()) this.removeObject(id)
          for (const obj of Object.values(store.scene.objects) as SceneObject[]) this.upsertObject(obj)
          break
      }
    })

    const loop = createLoop(() => this.frame(store))
    loop.start()

    return canvas.element
  }

  private upsertObject(obj: SceneObject): void {
    const existing = this.renderObjs.get(obj.id)
    if (existing) {
      // Reuse uniform buffer, just update its contents
      this.writeUniforms(existing.uniformBuffer, obj)
      return
    }
    const uniformBuffer = createUniformBuffer(this.device, UNIFORM_SIZE, `uniform-${obj.id}`)
    const bindGroup = this.device.createBindGroup({
      label: `bg-${obj.id}`,
      layout: this.bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    })
    this.renderObjs.set(obj.id, { type: obj.type, uniformBuffer, bindGroup })
    this.writeUniforms(uniformBuffer, obj)
  }

  private removeObject(id: string): void {
    const obj = this.renderObjs.get(id)
    if (obj) {
      obj.uniformBuffer.destroy()
      this.renderObjs.delete(id)
    }
  }

  private writeUniforms(buffer: GPUBuffer, obj: SceneObject): void {
    const data = new Float32Array(UNIFORM_SIZE / 4)
    data.set(buildModelMatrix(obj.transform, this.aspectRatio), 0)
    data.set(obj.color, 16) // offset 16 floats = 64 bytes = after the mat4x4f
    updateBuffer(this.device, buffer, data)
  }

  private frame(store: SceneStore): void {
    // Update uniforms for all objects (handles live aspect ratio changes)
    for (const [id, rObj] of this.renderObjs) {
      const sceneObj = store.scene.objects[id]
      if (sceneObj) this.writeUniforms(rObj.uniformBuffer, sceneObj)
    }

    const texture = this.context.getCurrentTexture()
    const passDesc = createRenderPassDescriptor({
      colorView: texture.createView(),
      clearColor: color(0.08, 0.08, 0.1, 1),
    })
    const encoder = this.device.createCommandEncoder()
    const pass = encoder.beginRenderPass(passDesc)

    pass.setPipeline(this.pipeline)

    // Draw in insertion order (objects rendered in the order they were added)
    for (const [id, rObj] of this.renderObjs) {
      const sceneObj = store.scene.objects[id]
      if (!sceneObj) continue

      const mesh = sceneObj.type === 'circle' ? this.circleMesh : this.quadMesh
      pass.setBindGroup(0, rObj.bindGroup)
      pass.setVertexBuffer(0, mesh.vertexBuffer)
      if (mesh.indexBuffer) {
        pass.setIndexBuffer(mesh.indexBuffer, mesh.indexFormat)
        pass.drawIndexed(mesh.drawCount)
      } else {
        pass.draw(mesh.drawCount)
      }
    }

    pass.end()
    this.device.queue.submit([encoder.finish()])
  }
}

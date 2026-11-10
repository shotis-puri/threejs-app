/**
 * Asset manifest. Add every model / texture here, nothing is loaded ad hoc.
 * Files live in /public, paths are relative to the site root.
 *
 * { name: 'robot', type: 'gltf',    path: '/models/robot.glb' }
 * { name: 'step', type: 'audio',   path: '/sounds/step.mp3' }
 * { name: 'grass', type: 'texture', path: '/textures/grass.jpg', colorSpace: 'srgb' }
 */
export default [
  { name: 'sam', type: 'gltf', path: '/models/sam.glb' },
  { name: 'pine', type: 'gltf', path: '/models/pine.glb' },
  { name: 'tree-quaternius', type: 'gltf', path: '/models/tree-quaternius.glb' },
  { name: 'tree-marc', type: 'gltf', path: '/models/tree-marc.glb' },
  { name: 'tree-poly', type: 'gltf', path: '/models/tree-poly.glb' },
  { name: 'walk', type: 'audio', path: '/sounds/walk.mp3' },
  { name: 'run', type: 'audio', path: '/sounds/run.mp3' },
]

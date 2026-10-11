import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, useCursor, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { books, coverFor, type Book } from './books'

type LibraryRoomProps = {
  saved: Book[]
  selectedId: string | null
  onSelect: (book: Book) => void
  className?: string
}

type Point3 = [number, number, number]

const JACKET_COLORS = ['#3b493f', '#835946', '#38454e', '#725d4c', '#4c5647', '#5b515c', '#71684f']
const SHELF_WIDTH = 8.15
const ROW_BASES = [1.12, -0.65, -2.42]
const FRAME_X = -1.44

/** A tiny procedural material set, generated locally — no stock textures or GLB downloads. */
function makeGrain(kind: 'oak' | 'plaster') {
  const canvas = document.createElement('canvas')
  canvas.width = kind === 'oak' ? 256 : 128
  canvas.height = kind === 'oak' ? 512 : 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Texture()
  let seed = 27843
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  ctx.fillStyle = kind === 'oak' ? '#caa77b' : '#f4f0e5'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (kind === 'oak') {
    for (let i = 0; i < 280; i += 1) {
      const x = random() * canvas.width
      const y = random() * canvas.height
      const length = 34 + random() * 370
      ctx.strokeStyle = random() > .58 ? 'rgba(98,58,25,.14)' : 'rgba(255,244,211,.23)'
      ctx.lineWidth = .45 + random() * 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.bezierCurveTo(x + (random() - .5) * 18, y + length * .33, x + (random() - .5) * 13, y + length * .75, x, y + length)
      ctx.stroke()
    }
  } else {
    for (let i = 0; i < 4100; i += 1) {
      const opacity = (random() * .09).toFixed(3)
      ctx.fillStyle = random() > .5 ? `rgba(87,76,57,${opacity})` : `rgba(255,255,255,${opacity})`
      ctx.fillRect(random() * canvas.width, random() * canvas.height, 1 + random(), 1 + random())
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 4
  return texture
}

function Block({
  position,
  size,
  rotation,
  color,
  map,
  roughness = .87,
  metalness = 0,
  castShadow = true,
}: {
  position: Point3
  size: Point3
  rotation?: Point3
  color: string
  map?: THREE.Texture
  roughness?: number
  metalness?: number
  castShadow?: boolean
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} map={map} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

function RoomShell({ oak, plaster }: { oak: THREE.Texture; plaster: THREE.Texture }) {
  const flooring = useMemo(() => {
    const result: { x: number; color: string }[] = []
    for (let index = 0; index < 20; index += 1) {
      result.push({
        x: -6.5 + index * .69,
        color: index % 4 === 1 ? '#e3c49d' : index % 3 === 1 ? '#d8b58a' : '#e5c49e',
      })
    }
    return result
  }, [])
  return (
    <group>
      {/* Enclosed plaster corner, visible material thickness and bevel-like trim. */}
      <Block position={[0, .3, -2.55]} size={[13.3, 7.6, .24]} color="#f3ede2" map={plaster} castShadow={false} />
      <Block position={[-6.52, .3, -.04]} size={[.24, 7.6, 5.2]} color="#e4dccd" map={plaster} castShadow={false} />
      <Block position={[0, -3.31, -.05]} size={[13.3, .22, 7.3]} color="#c7a47a" map={oak} />
      <Block position={[0, -2.99, -2.31]} size={[13.08, .16, .2]} color="#e9decd" />
      <Block position={[-6.37, -2.99, -.13]} size={[.18, .16, 4.82]} color="#efe3d3" />
      <Block position={[0, 3.34, -2.31]} size={[13.08, .2, .25]} color="#f8f0e3" />
      <Block position={[-6.3, 3.34, -.17]} size={[.18, .2, 4.83]} color="#f4e9db" />
      {flooring.map(({ x, color }, i) => (
        <Block key={i} position={[x, -3.185, -.05]} size={[.67, .05, 7.25]} color={color} map={oak} castShadow={false} />
      ))}
      {/* Linen rug sits in front of the reading chair. */}
      <Block position={[2.5, -3.115, 1.16]} size={[4.6, .035, 3.35]} color="#b1ae9a" castShadow={false} />
      <Block position={[2.5, -3.096, 1.16]} size={[4.15, .008, 2.93]} color="#d7d2c0" castShadow={false} />
      {Array.from({ length: 8 }, (_, i) => (
        <Block key={i} position={[.57 + i * .55, -3.087, .72]} size={[.014, .009, 2.4]} color="#bcb8a7" castShadow={false} />
      ))}
    </group>
  )
}

function LibraryCabinet({ oak }: { oak: THREE.Texture }) {
  return (
    <group>
      {/* Walnut recess and oak joinery are solid meshes, not an image plane. */}
      <Block position={[FRAME_X, -.15, -2.02]} size={[SHELF_WIDTH + .42, 6.5, .22]} color="#73543b" map={oak} />
      <Block position={[FRAME_X - SHELF_WIDTH / 2 - .08, -.12, -1.38]} size={[.23, 6.75, 1.31]} color="#a47a50" map={oak} />
      <Block position={[FRAME_X + SHELF_WIDTH / 2 + .08, -.12, -1.38]} size={[.23, 6.75, 1.31]} color="#ad8255" map={oak} />
      <Block position={[FRAME_X, 3.04, -1.38]} size={[SHELF_WIDTH + .54, .28, 1.42]} color="#b68e61" map={oak} />
      <Block position={[FRAME_X, -2.76, -1.36]} size={[SHELF_WIDTH + .53, .32, 1.54]} color="#997049" map={oak} />
      {ROW_BASES.map((base, index) => (
        <group key={index}>
          <Block position={[FRAME_X, base - .095, -1.37]} size={[SHELF_WIDTH + .31, .19, 1.42]} color={index === 2 ? '#b68c60' : '#c29a68'} map={oak} />
          <Block position={[FRAME_X, base - .15, -.655]} size={[SHELF_WIDTH + .31, .11, .10]} color="#875f3b" map={oak} />
        </group>
      ))}
      {/* Discreet dividing uprights. */}
      <Block position={[FRAME_X - 1.15, -.09, -2.02]} size={[.095, 5.7, .2]} color="#aa8057" map={oak} />
      <Block position={[FRAME_X + 1.7, -.09, -2.02]} size={[.095, 5.7, .2]} color="#aa8057" map={oak} />
    </group>
  )
}

function WindowAndSconce({ oak }: { oak: THREE.Texture }) {
  return (
    <group>
      {/* Recessed casement, muted outside daylight, muntins and linen curtain. */}
      <Block position={[4.52, .79, -2.365]} size={[2.66, 3.57, .13]} color="#b2c2be" castShadow={false} />
      <Block position={[4.52, .79, -2.285]} size={[2.39, 3.31, .022]} color="#9eb9b7" metalness={.03} roughness={.35} castShadow={false} />
      <Block position={[4.52, .79, -2.205]} size={[.13, 3.5, .17]} color="#f0e1ce" />
      <Block position={[4.52, .79, -2.2]} size={[2.56, .12, .17]} color="#eadbc7" />
      <Block position={[3.2, .79, -2.2]} size={[.13, 3.54, .2]} color="#e8dac6" />
      <Block position={[5.84, .79, -2.2]} size={[.13, 3.54, .2]} color="#e8dac6" />
      <Block position={[4.52, 2.53, -2.2]} size={[2.7, .17, .21]} color="#ede0ca" />
      <Block position={[4.52, -1.0, -2.16]} size={[2.95, .13, .5]} color="#a47c50" map={oak} />
      <Block position={[3.53, .79, -2.05]} size={[.23, 3.1, .07]} color="#e9e1cf" castShadow={false} />
      <Block position={[5.55, .79, -2.05]} size={[.23, 3.1, .07]} color="#e9e1cf" castShadow={false} />
      {Array.from({ length: 7 }, (_, i) => (
        <Block key={i} position={[3.24 + i * .065, .73, -1.96 + (i % 2) * .008]} size={[.055, 3.23, .025]} color={i % 2 ? '#ebe3d4' : '#f5eadb'} castShadow={false} />
      ))}
      {/* Wall lamp: real cylindrical mounting, articulated brass arm, shade and glowing bulb. */}
      <mesh position={[2.92, 1.31, -.28]} rotation={[0, Math.PI / 2.1, 0]} castShadow>
        <cylinderGeometry args={[.17, .17, .09, 18]} />
        <meshStandardMaterial color="#8e7142" metalness={.76} roughness={.3} />
      </mesh>
      <mesh position={[2.95, 1.24, .11]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[.031, .031, .75, 10]} />
        <meshStandardMaterial color="#90724a" metalness={.72} roughness={.26} />
      </mesh>
      <mesh position={[3.02, .99, .49]} rotation={[0, 0, Math.PI]} castShadow>
        <coneGeometry args={[.38, .46, 28, 1, true]} />
        <meshStandardMaterial color="#e7c7a1" roughness={.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[3.02, .86, .49]}>
        <sphereGeometry args={[.1, 12, 10]} />
        <meshStandardMaterial color="#ffe6b2" emissive="#ffcb78" emissiveIntensity={1.9} />
      </mesh>
      <pointLight position={[3.03, .83, .54]} intensity={12} distance={5.3} decay={2} color="#ffd6a0" />
    </group>
  )
}

function ReadingChair({ oak }: { oak: THREE.Texture }) {
  return (
    <group position={[4.38, -2.92, 1.34]} rotation={[0, -.34, 0]}>
      {([-1, 1] as const).flatMap(x =>
        ([-1, 1] as const).map(z => (
          <Block key={`${x}-${z}`} position={[x * .56, -.04, z * .48]} size={[.12, .62, .12]} color="#8d6843" map={oak} />
        )),
      )}
      <Block position={[0, .27, 0]} size={[1.47, .20, 1.22]} color="#94704f" map={oak} />
      <Block position={[0, .45, 0]} size={[1.37, .31, 1.13]} color="#c5b69e" roughness={.97} />
      <Block position={[0, 1.10, -.53]} size={[1.49, 1.46, .22]} rotation={[-.18, 0, 0]} color="#c3b098" roughness={.98} />
      <Block position={[-.72, .8, -.13]} size={[.21, .84, .93]} color="#c6b79f" roughness={.99} />
      <Block position={[.72, .8, -.13]} size={[.21, .84, .93]} color="#c6b79f" roughness={.99} />
      <Block position={[0, 1.1, -.35]} size={[1.22, .73, .085]} rotation={[-.18, 0, 0]} color="#ddd0bb" roughness={.99} />
      {/* A folded linen throw: creased geometry kept understated. */}
      <Block position={[.37, .65, .19]} size={[.6, .07, .73]} rotation={[0, .13, -.14]} color="#bcbfac" roughness={1} castShadow={false} />
    </group>
  )
}

function SideTable({ oak }: { oak: THREE.Texture }) {
  return (
    <group position={[2.57, -3.0, 1.41]}>
      <mesh position={[0, .76, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[.57, .57, .085, 28]} />
        <meshStandardMaterial color="#ae8159" map={oak} roughness={.83} />
      </mesh>
      <mesh position={[0, .35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[.11, .17, .72, 14]} />
        <meshStandardMaterial color="#76513c" roughness={.75} />
      </mesh>
      <mesh position={[0, .035, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[.37, .37, .075, 22]} />
        <meshStandardMaterial color="#836045" roughness={.7} />
      </mesh>
      <mesh position={[.17, .92, -.11]} castShadow>
        <cylinderGeometry args={[.17, .12, .28, 20]} />
        <meshStandardMaterial color="#a5aa9a" roughness={.93} />
      </mesh>
      <mesh position={[.17, 1.09, -.11]} castShadow>
        <cylinderGeometry args={[.06, .06, .07, 16]} />
        <meshStandardMaterial color="#ded9c7" roughness={.9} />
      </mesh>
      <Block position={[-.17, .85, .15]} size={[.28, .05, .37]} color="#e5d6b6" rotation={[0, -.2, 0]} castShadow={false} />
    </group>
  )
}

function BackgroundBook({ position, index, rotation = 0 }: { position: Point3; index: number; rotation?: number }) {
  const width = .18 + (index % 4) * .038
  const height = 1.08 + (index % 5) * .09
  const color = JACKET_COLORS[index % JACKET_COLORS.length]
  return (
    <group position={[position[0], position[1] + height / 2, position[2]]} rotation={[0, rotation, 0]}>
      <Block position={[0, 0, 0]} size={[width, height, .31]} color={color} roughness={.87} />
      <Block position={[width / 2 + .004, 0, 0]} size={[.009, height - .075, .24]} color="#dfd1af" castShadow={false} />
      <Block position={[0, height / 2 + .005, 0]} size={[width - .035, .008, .26]} color="#e9dcbc" castShadow={false} />
      <Block position={[-width / 2 - .004, -.13, .05]} size={[.012, .022, .22]} color="#b49b64" castShadow={false} />
      <Block position={[-width / 2 - .004, .14, .05]} size={[.012, .018, .22]} color="#b49b64" castShadow={false} />
    </group>
  )
}

/**
 * A genuine six-faced volume: jacket, visible paper block, spine, top page edge
 * and back boards have thickness. Only the front cover is a texture plane.
 */
function BookVolume({
  book,
  position,
  rotation,
  selected,
  onSelect,
  order,
}: {
  book: Book
  position: Point3
  rotation: number
  selected: boolean
  onSelect: (book: Book) => void
  order: number
}) {
  const cover = useTexture(coverFor(book))
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const w = .68 + (order % 4) * .035
  const h = 1.44 + (order % 5) * .065
  const d = .16 + (order % 3) * .044
  const shade = JACKET_COLORS[order % JACKET_COLORS.length]

  useEffect(() => {
    cover.colorSpace = THREE.SRGBColorSpace
    cover.anisotropy = 4
  }, [cover])

  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelect(book)
  }
  return (
    <group
      position={[position[0], position[1] + h / 2, position[2]]}
      rotation={[0, rotation, (order % 6 === 4 ? -.09 : .005)]}
      onClick={click}
      onPointerOver={event => { event.stopPropagation(); setHovered(true) }}
      onPointerOut={event => { event.stopPropagation(); setHovered(false) }}
    >
      <group position={[0, hovered || selected ? .045 : 0, 0]}>
        {/* Deliberately larger than the jacket to make phone selection practical. */}
        <mesh>
          <boxGeometry args={[w + .2, h + .09, d + .35]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <Block position={[0, 0, 0]} size={[w, h, d]} color={shade} roughness={.76} />
        {/* Mottled endpapers and the page edges, inset behind hardbound covers. */}
        <Block position={[w / 2 - .027, 0, .005]} size={[.022, h - .064, d - .037]} color="#e9dcc1" castShadow={false} />
        <Block position={[0, h / 2 - .031, 0]} size={[w - .065, .016, d - .04]} color="#f0e5cc" castShadow={false} />
        <Block position={[0, -h / 2 + .03, 0]} size={[w - .067, .016, d - .04]} color="#cabb9d" castShadow={false} />
        <Block position={[-w / 2 + .027, 0, .005]} size={[.045, h - .01, d + .015]} color={shade} />
        <mesh position={[0, 0, d / 2 + .004]} castShadow>
          <planeGeometry args={[w - .008, h - .008]} />
          <meshStandardMaterial map={cover} roughness={.72} metalness={0} side={THREE.FrontSide} />
        </mesh>
        <Block position={[0, 0, -d / 2 - .005]} size={[w, h, .009]} color={shade} castShadow={false} />
        {selected && (
          <mesh position={[0, -h / 2 + .018, d / 2 + .011]}>
            <boxGeometry args={[w + .06, .038, .045]} />
            <meshStandardMaterial color="#d6bb80" metalness={.63} roughness={.36} emissive="#61471d" emissiveIntensity={.15} />
          </mesh>
        )}
      </group>
    </group>
  )
}

function ShelfContents({
  selectedId,
  onSelect,
  saved,
}: {
  selectedId: string | null
  onSelect: (book: Book) => void
  saved: Book[]
}) {
  const arranged = useMemo(() => {
    const kept = saved.slice(0, 7)
    const keptIds = new Set(kept.map(book => book.id))
    const rest = books.filter(book => !keptIds.has(book.id))
    // Three distinct shelves: a central personally saved shelf and two curated rows.
    const mid = kept.length ? kept : rest.splice(0, 5)
    return [rest.slice(0, 5), mid, rest.slice(5, 11)]
  }, [saved])

  return (
    <group>
      {arranged.map((row, rowIndex) => {
        const y = ROW_BASES[rowIndex]
        const slots = rowIndex === 1 ? [-4.7, -3.72, -2.76, -1.8, -.84, .12, 1.08] : [-4.65, -3.32, -1.99, -.66, .67, 1.98]
        return (
          <group key={rowIndex}>
            {/* Anonymous physical book-spines quietly complete the furnished shelves. */}
            {Array.from({ length: rowIndex === 1 ? 12 : 14 }, (_, i) => {
              const x = -4.95 + i * .38
              return <BackgroundBook key={i} index={rowIndex * 15 + i} position={[x, y, -1.47]} rotation={i % 6 === 2 ? -.14 : 0} />
            })}
            {row.map((book, index) => (
              <Suspense key={book.id} fallback={<BackgroundBook index={index + 20} position={[slots[index], y, -.85]} />}>
                <BookVolume
                  book={book}
                  position={[slots[index], y, -.83 + (index % 3) * .045]}
                  rotation={index % 4 === 1 ? -.25 : index % 4 === 2 ? .23 : -.065}
                  selected={selectedId === book.id}
                  onSelect={onSelect}
                  order={rowIndex * 7 + index}
                />
              </Suspense>
            ))}
          </group>
        )
      })}
      {/* A ceramic sculptural vessel, rather than another UI badge. */}
      <mesh position={[1.72, 1.47, -.97]} castShadow>
        <cylinderGeometry args={[.22, .16, .48, 16]} />
        <meshStandardMaterial color="#d8cabc" roughness={.97} />
      </mesh>
      <mesh position={[1.72, 1.75, -.97]}>
        <cylinderGeometry args={[.09, .09, .06, 16]} />
        <meshStandardMaterial color="#e8d8c7" roughness={.95} />
      </mesh>
    </group>
  )
}

function LibraryScene({ saved, selectedId, onSelect, compact }: LibraryRoomProps & { compact: boolean }) {
  const oak = useMemo(() => makeGrain('oak'), [])
  const plaster = useMemo(() => makeGrain('plaster'), [])
  useEffect(() => () => {
    oak.dispose()
    plaster.dispose()
  }, [oak, plaster])

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={compact ? [4.8, 3.9, 13.1] : [5.1, 3.55, 12.1]}
        fov={compact ? 40 : 37.5}
        near={.1}
        far={65}
      />
      <color attach="background" args={['#e2d7c6']} />
      <ambientLight intensity={.54} color="#ffeed7" />
      <hemisphereLight args={['#cfdfe0', '#a78663', 1.07]} />
      <directionalLight
        castShadow
        position={[6.4, 9.5, 8]}
        color="#fff0d9"
        intensity={2.3}
        shadow-mapSize={[compact ? 512 : 1024, compact ? 512 : 1024]}
        shadow-bias={-.00012}
        shadow-normalBias={.025}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-radius={4}
      />
      <spotLight position={[1.5, 5, 4]} color="#ffd6a3" intensity={20} angle={.65} penumbra={1} distance={17} decay={2} />
      <RoomShell oak={oak} plaster={plaster} />
      <LibraryCabinet oak={oak} />
      <WindowAndSconce oak={oak} />
      <ShelfContents saved={saved} selectedId={selectedId} onSelect={onSelect} />
      <ReadingChair oak={oak} />
      <SideTable oak={oak} />
      <OrbitControls
        makeDefault
        target={compact ? [-.65, -.85, -1.15] : [-.5, -.68, -1.15]}
        enablePan={false}
        enableDamping
        dampingFactor={.065}
        rotateSpeed={compact ? .33 : .42}
        zoomSpeed={.44}
        minDistance={compact ? 11.5 : 9.7}
        maxDistance={compact ? 21 : 19}
        minPolarAngle={.95}
        maxPolarAngle={1.62}
        minAzimuthAngle={-.67}
        maxAzimuthAngle={.72}
        enableRotate
        enableZoom={false}
      />
    </>
  )
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2', { powerPreference: 'low-power' }) || canvas.getContext('webgl', { powerPreference: 'low-power' })
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

class WebGLGuard extends Component<{ children: ReactNode; fallback: ReactNode }, { broken: boolean }> {
  state = { broken: false }
  static getDerivedStateFromError() { return { broken: true } }
  componentDidCatch(error: Error) { console.warn('DENG 3D library unavailable:', error.message) }
  render() { return this.state.broken ? this.props.fallback : this.props.children }
}

function RoomFallback({ booksOnShelf, onSelect }: { booksOnShelf: Book[]; onSelect: (book: Book) => void }) {
  return (
    <div className="deng-lib__webgl-fallback">
      <p>This device can’t display the 3D room. Your collection is still available below.</p>
      <div className="deng-lib__webgl-covers">
        {booksOnShelf.slice(0, 6).map(book => (
          <button key={book.id} type="button" onClick={() => onSelect(book)} aria-label={`Select ${book.title}`}>
            <img src={coverFor(book)} alt="" />
            <span>{book.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function LibraryRoom3D({ saved, selectedId, onSelect, className = '' }: LibraryRoomProps) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 690px)').matches)
  useEffect(() => {
    setSupported(supportsWebGL())
    const media = window.matchMedia('(max-width: 690px)')
    const listener = () => setCompact(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])
  const fallback = <RoomFallback booksOnShelf={saved.length ? saved : books} onSelect={onSelect} />
  return (
    <div className={`deng-lib__room-canvas ${className}`}>
      {supported === false ? fallback : supported === null ? (
        <div className="deng-lib__room-loading" role="status">Opening your library…</div>
      ) : (
        <WebGLGuard fallback={fallback}>
          <Canvas
            shadows
            frameloop="demand"
            dpr={[1, compact ? 1.35 : 1.6]}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping
              gl.toneMappingExposure = 1.08
              gl.outputColorSpace = THREE.SRGBColorSpace
            }}
            role="img"
            aria-label="Interactive 3D home library with oak shelves and selectable real book covers. The accessible book list follows below."
          >
            <LibraryScene saved={saved} selectedId={selectedId} onSelect={onSelect} compact={compact} />
          </Canvas>
        </WebGLGuard>
      )}
    </div>
  )
}

import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, RoundedBox, useCursor, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { books, coverFor, type Book } from './books'

type LibraryRoomProps = {
  saved: Book[]
  selectedId: string | null
  onSelect: (book: Book, origin?: BookScreenOrigin) => void
  /** Called once AFTER the formerly hidden volume has painted on its shelf. */
  onBookRestored?: (bookId: string) => void
  className?: string
}

/** CSS pixels measured against the viewport, NOT against the WebGL canvas. */
export type BookScreenOrigin = { x: number; y: number; width: number; height: number }

type Point3 = [number, number, number]

const JACKET_COLORS = ['#3b493f', '#835946', '#38454e', '#725d4c', '#4c5647', '#5b515c', '#71684f']
const SHELF_WIDTH = 8.15
const ROW_BASES = [1.12, -0.65, -2.42]
const FRAME_X = -1.44

/**
 * Hand-authored, deterministic material maps. Actual wood fibres, knots,
 * mineral speckle and linen weave are drawn once on the CPU, never animated.
 * Their maps and subtle bump make the geometry read like furnished architecture
 * rather than a group of uniformly shaded cuboids.
 */
function makeGrain(kind: 'oak' | 'plaster' | 'travertine' | 'linen' | 'outside') {
  const canvas = document.createElement('canvas')
  canvas.width = kind === 'oak' || kind === 'outside' ? 512 : 256
  canvas.height = kind === 'oak' || kind === 'outside' ? 512 : 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Texture()
  let seed = 27843
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  ctx.fillStyle = ({ oak: '#d1b18d', plaster: '#eee8db', travertine: '#d9cabb', linen: '#d8d2c1', outside: '#9cc0bd' })[kind]
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (kind === 'oak') {
    for (let i = 0; i < 2300; i += 1) {
      const x = random() * canvas.width
      const y = random() * canvas.height
      const length = 40 + random() * 390
      ctx.strokeStyle = random() > .45 ? `rgba(73,44,28,${(.017 + random() * .105).toFixed(3)})` : `rgba(255,245,226,${(.035 + random() * .18).toFixed(3)})`
      ctx.lineWidth = .22 + random() * 1.25
      ctx.beginPath()
      ctx.moveTo(x, y)
      const sway = (random() - .5) * 12
      ctx.bezierCurveTo(x + sway, y + length * .33, x - sway * .4, y + length * .75, x + sway * .5, y + length)
      ctx.stroke()
    }
    // Fine elliptical cathedrals from sliced wood, not loud painted stripes.
    for (let i = 0; i < 5; i += 1) {
      const x = 35 + random() * 435
      const y = 40 + random() * 420
      for (let ring = 0; ring < 7; ring += 1) {
        ctx.strokeStyle = `rgba(81,51,33,${(.025 + (7 - ring) * .005).toFixed(3)})`
        ctx.lineWidth = .5
        ctx.beginPath()
        ctx.ellipse(x, y, 3 + ring * 2.7, 11 + ring * 14, .11, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  } else if (kind === 'outside') {
    const sky = ctx.createLinearGradient(0, 0, 0, 512)
    sky.addColorStop(0, '#b3ced0')
    sky.addColorStop(.50, '#d1d8c9')
    sky.addColorStop(.7, '#aeb5a6')
    sky.addColorStop(1, '#788b75')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 512, 512)
    ctx.fillStyle = 'rgba(234,229,202,.42)'
    ctx.beginPath()
    ctx.ellipse(356, 113, 68, 36, -.22, 0, Math.PI * 2)
    ctx.fill()
    for (let layer = 0; layer < 3; layer += 1) {
      ctx.beginPath()
      const baseline = 315 + layer * 68
      ctx.moveTo(0, 512)
      ctx.lineTo(0, baseline)
      for (let x = 0; x <= 512; x += 12) ctx.lineTo(x, baseline - Math.sin(x / (65 + layer * 16)) * (22 + layer * 8) - random() * (14 + layer * 7))
      ctx.lineTo(512, 512)
      ctx.closePath()
      ctx.fillStyle = ['#859b8f', '#718777', '#576c59'][layer]
      ctx.fill()
    }
    // Soft irregular leafy silhouettes immediately beyond the window.
    for (let i = 0; i < 150; i += 1) {
      const x = random() * 590 - 30
      const y = 343 + random() * 190
      ctx.fillStyle = random() > .55 ? 'rgba(54,80,57,.27)' : 'rgba(172,166,117,.21)'
      ctx.beginPath()
      ctx.ellipse(x, y, 6 + random() * 23, 7 + random() * 19, random(), 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    const count = kind === 'plaster' ? 18000 : kind === 'travertine' ? 7900 : 5200
    for (let i = 0; i < count; i += 1) {
      const x = random() * 256
      const y = random() * 256
      const opacity = (random() * (kind === 'linen' ? .16 : .11)).toFixed(3)
      ctx.fillStyle = random() > .48 ? `rgba(81,72,55,${opacity})` : `rgba(255,255,246,${opacity})`
      if (kind === 'linen') ctx.fillRect(x, y, .4 + random() * 1.3, 3 + random() * 7)
      else if (kind === 'travertine') ctx.fillRect(x, y, 1 + random() * 4, .25 + random() * 1.5)
      else ctx.fillRect(x, y, 1 + random() * 1.2, 1 + random() * 1.2)
    }
    if (kind === 'linen') {
      for (let i = 0; i < 256; i += 3) {
        ctx.strokeStyle = 'rgba(95,85,66,.055)'
        ctx.beginPath(); ctx.moveTo(0, i + .5); ctx.lineTo(256, i + .5); ctx.stroke()
      }
    }
    if (kind === 'travertine') {
      for (let i = 0; i < 19; i += 1) {
        const y = random() * 256
        ctx.strokeStyle = 'rgba(124,97,73,.09)'
        ctx.lineWidth = .3 + random() * 1.5
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(90, y - 3, 157, y + 4, 256, y - 1)
        ctx.stroke()
      }
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
  bumpScale = 0,
  castShadow = true,
}: {
  position: Point3
  size: Point3
  rotation?: Point3
  color: string
  map?: THREE.Texture
  roughness?: number
  metalness?: number
  bumpScale?: number
  castShadow?: boolean
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} map={map} bumpMap={bumpScale && map ? map : undefined} bumpScale={bumpScale} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

function BeveledBoard({
  position, size, color, map, radius = .045, roughness = .7,
}: {
  position: Point3; size: Point3; color: string; map?: THREE.Texture; radius?: number; roughness?: number
}) {
  return (
    <RoundedBox args={size} position={position} radius={radius} smoothness={3} castShadow receiveShadow>
      <meshStandardMaterial color={color} map={map} roughness={roughness} bumpMap={map} bumpScale={.012} />
    </RoundedBox>
  )
}

function RoomShell({ oak, oakHorizontal, plaster, stone }: { oak: THREE.Texture; oakHorizontal: THREE.Texture; plaster: THREE.Texture; stone: THREE.Texture }) {
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
      {/* Enclosed limewashed walls, shadow-gap baseboard, fine wall panelling. */}
      <Block position={[0, .3, -2.55]} size={[13.3, 7.6, .24]} color="#f9f6ec" map={plaster} bumpScale={.025} castShadow={false} />
      <Block position={[-6.52, .3, -.04]} size={[.24, 7.6, 5.2]} color="#f2eee4" map={plaster} bumpScale={.022} castShadow={false} />
      <Block position={[0, -3.31, -.05]} size={[13.3, .22, 7.3]} color="#bda17d" map={oak} bumpScale={.018} />
      <Block position={[0, -3.04, -2.38]} size={[13.05, .035, .10]} color="#bdb3a2" castShadow={false} />
      <BeveledBoard position={[0, -2.87, -2.33]} size={[13.08, .27, .19]} color="#f3ecdf" roughness={.92} />
      <BeveledBoard position={[-6.37, -2.89, -.13]} size={[.17, .28, 4.82]} color="#f3ecdf" roughness={.93} />
      <Block position={[0, 3.32, -2.31]} size={[13.08, .18, .23]} color="#f5ede0" map={plaster} />
      <BeveledBoard position={[0, 3.14, -2.32]} size={[13.08, .075, .32]} color="#f7f2e8" roughness={.91} />
      <BeveledBoard position={[-6.3, 3.18, -.17]} size={[.21, .1, 4.83]} color="#f6ede1" roughness={.93} />
      {/* Shallow inset plaster panels frame the millwork instead of flat walls. */}
      {[-5.92, -5.48, 2.86].map(x => (
        <Block key={x} position={[x, .08, -2.418]} size={[.018, 5.75, .024]} color="#e6ddce" castShadow={false} />
      ))}
      <Block position={[0, -1.17, -2.425]} size={[12.98, .023, .023]} color="#e7dfd3" castShadow={false} />
      {flooring.map(({ x, color }, i) => (
        <group key={i}>
          <Block position={[x, -3.185, -.05]} size={[.682, .05, 7.25]} color={color} map={oakHorizontal} bumpScale={.012} castShadow={false} />
          <Block position={[x+.342, -3.157, -.05]} size={[.007, .004, 7.25]} color="#9b7b5c" castShadow={false} />
        </group>
      ))}
      {/* Stone hearth-like foundation beneath the reading area and real woven rug. */}
      <BeveledBoard position={[2.56, -3.126, 1.18]} size={[4.82, .055, 3.49]} color="#d8d3c7" map={stone} radius={.018} roughness={.91} />
      <Block position={[2.56, -3.087, 1.18]} size={[4.36, .035, 3.05]} color="#e4e1d4" map={stone} bumpScale={.014} castShadow={false} />
      {Array.from({ length: 8 }, (_, i) => (
        <Block key={i} position={[.66 + i * .55, -3.067, .58]} size={[.009, .005, 2.25]} color="#c3bbae" castShadow={false} />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <Block key={i} position={[.43 + i * .32, -3.068, 2.685]} size={[.018, .006, .14]} color="#b2ac9c" castShadow={false} />
      ))}
    </group>
  )
}

function LibraryCabinet({ oak, oakHorizontal }: { oak: THREE.Texture; oakHorizontal: THREE.Texture }) {
  return (
    <group>
      {/* Cabinet maker's construction: shadowed inset, face stiles, rounded
          solid-oak shelves, proud moulded edges and a recessed toe-kick. */}
      <Block position={[FRAME_X, -.15, -2.03]} size={[SHELF_WIDTH + .43, 6.5, .21]} color="#634b37" map={oak} bumpScale={.027} />
      {[FRAME_X - SHELF_WIDTH / 2 - .085, FRAME_X + SHELF_WIDTH / 2 + .085].map((x,i) => (
        <group key={i}>
          <BeveledBoard position={[x, -.12, -1.37]} size={[.25, 6.75, 1.39]} color="#c4a076" map={oak} radius={.052} />
          <BeveledBoard position={[x + (i ? -.04 : .04), -.12, -.663]} size={[.115, 6.75, .11]} color="#d9b589" map={oak} radius={.03} />
        </group>
      ))}
      <BeveledBoard position={[FRAME_X, 3.04, -1.37]} size={[SHELF_WIDTH + .65, .29, 1.48]} color="#cba57a" map={oakHorizontal} radius={.05} />
      <BeveledBoard position={[FRAME_X, -2.76, -1.36]} size={[SHELF_WIDTH + .64, .34, 1.57]} color="#a98460" map={oakHorizontal} radius={.044} />
      <Block position={[FRAME_X, -2.975, -1.37]} size={[SHELF_WIDTH + .34, .12, 1.17]} color="#4a3829" map={oak} />
      <BeveledBoard position={[FRAME_X, -3.015, -.75]} size={[SHELF_WIDTH + .41, .12, .12]} color="#b78e67" map={oak} radius={.025} />
      {/* Vertical back-panel joints: subtle changes of grain, never filler books. */}
      {Array.from({length:7},(_,i)=>(
        <Block key={i} position={[FRAME_X - 3.77 + i * 1.24,-.12,-1.899]} size={[.017,5.98,.015]} color="#4c3c2c" castShadow={false}/>
      ))}
      {ROW_BASES.map((base, index) => (
        <group key={index}>
          <BeveledBoard position={[FRAME_X, base - .095, -1.37]} size={[SHELF_WIDTH + .31, .19, 1.44]} color="#cba77d" map={oakHorizontal} radius={.034} />
          <BeveledBoard position={[FRAME_X, base - .16, -.63]} size={[SHELF_WIDTH + .38, .13, .13]} color="#ac805a" map={oak} radius={.02} />
          <Block position={[FRAME_X, base - .09, -.559]} size={[SHELF_WIDTH + .18, .011, .012]} color="#d9b994" castShadow={false} />
          {/* Discreet moulded inset under each board, gives shelf underside depth. */}
          <Block position={[FRAME_X, base - .25, -1.44]} size={[SHELF_WIDTH - .16, .062, 1.05]} color="#816245" map={oakHorizontal} castShadow={false} />
        </group>
      ))}
      {/* Short face-frame supports keep covers unobstructed. */}
      {[-3.5,3.5].map(x=><BeveledBoard key={x} position={[FRAME_X + x,-.08,-1.82]} size={[.09,5.7,.12]} color="#a7805d" map={oak} radius={.018}/>)}
    </group>
  )
}

function WindowAndSconce({ oak, stone, outside }: { oak: THREE.Texture; stone: THREE.Texture; outside: THREE.Texture }) {
  return (
    <group>
      {/* Window is a real layered reveal: exterior landscape, two depths of
          painted joinery, glazing, divided lights and travertine stool. */}
      <mesh position={[4.52, .79, -2.405]}>
        <planeGeometry args={[2.68, 3.61]} />
        <meshBasicMaterial map={outside} toneMapped={false} />
      </mesh>
      <mesh position={[4.52, .79, -2.37]}>
        <planeGeometry args={[2.67, 3.55]} />
        <meshPhysicalMaterial color="#ebf5ef" transparent opacity={.12} metalness={.04} roughness={.13} clearcoat={.48} clearcoatRoughness={.12} depthWrite={false} />
      </mesh>
      <BeveledBoard position={[4.52, .79, -2.18]} size={[2.78, 3.75, .19]} color="#f2eee4" roughness={.73} radius={.035} />
      <Block position={[4.52, .79, -2.068]} size={[2.53, 3.51, .03]} color="#d5dbd2" castShadow={false} />
      <mesh position={[4.52, .79, -2.044]}>
        <planeGeometry args={[2.48, 3.43]} />
        <meshBasicMaterial map={outside} toneMapped={false} />
      </mesh>
      <mesh position={[4.52, .79, -2.014]}>
        <planeGeometry args={[2.48, 3.43]} />
        <meshPhysicalMaterial color="#f7faf5" transparent opacity={.15} roughness={.1} metalness={.035} clearcoat={.8} depthWrite={false} />
      </mesh>
      {[-1.28,1.28].map(x=><BeveledBoard key={x} position={[4.52+x,.79,-1.992]} size={[.13,3.52,.20]} color="#f4eadb" radius={.025}/>)}
      {[-1.75,1.75].map(y=><BeveledBoard key={y} position={[4.52,.79+y,-1.992]} size={[2.68,.13,.20]} color="#f4eadb" radius={.025}/>)}
      <BeveledBoard position={[4.52, .79, -1.975]} size={[.09, 3.5, .18]} color="#ede4d6" radius={.019} />
      <BeveledBoard position={[4.52, .79, -1.965]} size={[2.55, .095, .17]} color="#ede4d6" radius={.019} />
      <BeveledBoard position={[4.52, -1.07, -1.98]} size={[3.0, .13, .48]} color="#f0e5d4" map={stone} radius={.02} roughness={.85} />
      <Block position={[4.52,-1.15,-1.71]} size={[3.02,.035,.055]} color="#c7b7a5" castShadow={false}/>
      {/* Narrow linen curtain stack has folds/cast shadows, not a flat panel. */}
      {Array.from({length:8},(_,i)=>(
        <mesh key={i} position={[3.22 + .061*i,.71,-1.82 - (i%2)*.035]} castShadow>
          <cylinderGeometry args={[.045,.047,3.19,10]}/>
          <meshStandardMaterial color={i%2?'#eadfca':'#fff7e7'} roughness={.98} transparent opacity={.93}/>
        </mesh>
      ))}
      {/* Compact brushed-brass picture light, readable without luminous cones. */}
      <mesh position={[2.89, 1.38, -.64]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <cylinderGeometry args={[.135, .135, .095, 24]} />
        <meshStandardMaterial color="#aa8758" metalness={.79} roughness={.29} />
      </mesh>
      <mesh position={[2.93, 1.23, -.32]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[.026, .026, .65, 12]} />
        <meshStandardMaterial color="#bc9765" metalness={.8} roughness={.26} />
      </mesh>
      <mesh position={[3, 1.0, .06]} rotation={[0,0,Math.PI]} castShadow>
        <latheGeometry args={[[[.12,.23],[.21,.21],[.295,.10],[.31,-.035],[.26,-.14],[.09,-.18]].map(([r,y])=>new THREE.Vector2(r,y)),24]}/>
        <meshStandardMaterial color="#e3cfad" side={THREE.DoubleSide} roughness={.72} />
      </mesh>
      <mesh position={[3,.82,.06]}>
        <sphereGeometry args={[.075,12,12]}/>
        <meshStandardMaterial emissive="#f4c889" emissiveIntensity={.75} color="#f5deb8"/>
      </mesh>
      <pointLight position={[3, .77,.10]} intensity={7} distance={3.9} decay={2} color="#ffd6ab" />
    </group>
  )
}

function ReadingChair({ oak, linen }: { oak: THREE.Texture; linen: THREE.Texture }) {
  return (
    <group position={[4.37, -2.91, 1.32]} rotation={[0, -.19, 0]}>
      {([-1, 1] as const).flatMap(x =>
        ([-1, 1] as const).map(z => (
          <group key={`${x}-${z}`}>
            <mesh position={[x*.59,.03,z*.49]} rotation={[z*.08,0,x*.065]} castShadow>
              <cylinderGeometry args={[.072,.052,.73,12]}/>
              <meshStandardMaterial color="#856345" map={oak} roughness={.62}/>
            </mesh>
            <mesh position={[x*.61,-.335,z*.49]} castShadow>
              <cylinderGeometry args={[.057,.056,.08,14]}/>
              <meshStandardMaterial color="#8d795d" metalness={.5} roughness={.4}/>
            </mesh>
          </group>
        )),
      )}
      {/* Slim solid oak frame visible under softly rounded linen cushions. */}
      <BeveledBoard position={[0,.29,-.03]} size={[1.5,.20,1.29]} color="#957452" map={oak} radius={.065}/>
      <RoundedBox args={[1.43,.34,1.29]} radius={.15} smoothness={4} position={[0,.46,.02]} castShadow receiveShadow>
        <meshStandardMaterial map={linen} color="#f0e9dd" roughness={.99} bumpMap={linen} bumpScale={.033}/>
      </RoundedBox>
      <RoundedBox args={[1.47,1.48,.32]} radius={.14} smoothness={4} position={[0,1.23,-.52]} rotation={[-.13,0,0]} castShadow receiveShadow>
        <meshStandardMaterial map={linen} color="#d9d0bf" roughness={.98} bumpMap={linen} bumpScale={.026}/>
      </RoundedBox>
      <RoundedBox args={[1.19,.80,.25]} radius={.12} smoothness={4} position={[0,1.19,-.28]} rotation={[-.12,0,0]} castShadow receiveShadow>
        <meshStandardMaterial map={linen} color="#fcf6e7" roughness={1} bumpMap={linen} bumpScale={.022}/>
      </RoundedBox>
      {[-.74,.74].map(x=>(
        <group key={x}>
          <RoundedBox args={[.25,.77,1.15]} radius={.105} smoothness={4} position={[x,.81,-.11]} castShadow receiveShadow>
            <meshStandardMaterial map={linen} color="#e3d8c5" roughness={1} bumpMap={linen} bumpScale={.02}/>
          </RoundedBox>
          <Block position={[x*1.15,.55,-.13]} size={[.047,.25,1.04]} color="#90704e" map={oak}/>
        </group>
      ))}
      {/* A slumped woven lumbar cushion, not a rigid decorative cube. */}
      <mesh position={[-.08,.89,-.13]} rotation={[-.07,0,.12]} scale={[.47,.31,.16]} castShadow>
        <sphereGeometry args={[1,24,16]}/>
        <meshStandardMaterial map={linen} color="#d0d6c5" roughness={1} bumpMap={linen} bumpScale={.03}/>
      </mesh>
      {/* Very fine upholstery seams trace the silhouette. */}
      <Block position={[0,.645,.69]} size={[1.15,.008,.018]} color="#d6cbb7" castShadow={false}/>
    </group>
  )
}

function SideTable({ oak, stone }: { oak: THREE.Texture; stone: THREE.Texture }) {
  return (
    <group position={[2.57, -3.0, 1.41]}>
      <mesh position={[0, .79, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[.54, .54, .095, 48]} />
        <meshStandardMaterial map={stone} color="#f7ede0" bumpMap={stone} bumpScale={.015} roughness={.63} />
      </mesh>
      <mesh position={[0, .72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[.47,.49,.075,48]}/>
        <meshStandardMaterial color="#886b4f" metalness={.23} roughness={.5}/>
      </mesh>
      <mesh position={[0, .37, 0]} castShadow receiveShadow>
        <latheGeometry args={[[[.33,0],[.23,.05],[.19,.13],[.13,.3],[.115,.52],[.17,.7],[.18,.74]].map(([r,y])=>new THREE.Vector2(r,y)),32]}/>
        <meshStandardMaterial color="#987552" map={oak} roughness={.65}/>
      </mesh>
      <mesh position={[0,.055,0]} castShadow>
        <cylinderGeometry args={[.32,.32,.085,40]}/>
        <meshStandardMaterial color="#8e6d4b" map={oak} roughness={.68}/>
      </mesh>
      <mesh position={[.15, .95, -.11]} castShadow>
        <cylinderGeometry args={[.145, .125, .19, 24]} />
        <meshStandardMaterial color="#f2ece0" roughness={.87} />
      </mesh>
      <mesh position={[.15,1.05,-.11]} rotation={[-Math.PI/2,0,0]}>
        <torusGeometry args={[.125,.014,8,28]}/>
        <meshStandardMaterial color="#d1c7b6" roughness={.8}/>
      </mesh>
      <mesh position={[.29, .945, -.11]} rotation={[0,0,Math.PI/2]} castShadow>
        <torusGeometry args={[.085,.021,9,20]}/>
        <meshStandardMaterial color="#f0eadb" roughness={.87}/>
      </mesh>
      <mesh position={[.15,.825,-.11]} castShadow>
        <cylinderGeometry args={[.21,.21,.027,24]}/>
        <meshStandardMaterial color="#eae0ce" roughness={.89}/>
      </mesh>
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
  onSelect: (book: Book, origin?: BookScreenOrigin) => void
  order: number
}) {
  const cover = useTexture(coverFor(book))
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const animatedRef = useRef<THREE.Group>(null)
  const coverRef = useRef<THREE.Mesh>(null)
  const hoverRef = useRef(false)
  const reducedRef = useRef(false)
  const previousSelected = useRef(selected)
  const { camera, gl, invalidate } = useThree()
  const w = .79 + (order % 4) * .031
  const h = 1.44 + (order % 5) * .065
  // Page-block thickness follows the catalogue's real estimated duration,
  // rather than decorative random widths (short Kafka ≠ long Jane Eyre).
  const d = THREE.MathUtils.clamp(.13 + book.minutes / 5100, .14, .37)
  const shade = JACKET_COLORS[order % JACKET_COLORS.length]

  useEffect(() => {
    cover.colorSpace = THREE.SRGBColorSpace
    cover.anisotropy = 4
  }, [cover])

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = motion.matches
    const listener = () => {
      reducedRef.current = motion.matches
      invalidate()
    }
    motion.addEventListener('change', listener)
    return () => motion.removeEventListener('change', listener)
  }, [invalidate])

  // Important FLIP seam: the hidden mesh may have been hovering with non-zero
  // spring offsets when it vanished. Reset synchronously BEFORE it can render
  // visible on modal close; request a demand-mode render on both transitions.
  useLayoutEffect(() => {
    const wasSelected = previousSelected.current
    previousSelected.current = selected
    if (!wasSelected && !selected) return
    hoverRef.current = false
    setHovered(false)
    const animated = animatedRef.current
    if (animated) {
      animated.position.set(0, 0, 0)
      animated.rotation.set(0, 0, 0)
    }
    invalidate()
  }, [selected, invalidate])

  // R3F uses demand rendering. Schedule the next frame only while the physical
  // cover is still moving: silky hover without an always-running render loop.
  useFrame((_, dt) => {
    const animated = animatedRef.current
    if (!animated) return
    const active = hoverRef.current && !selected && !reducedRef.current
    const y = active ? .15 : 0
    const z = active ? .46 : 0
    const tip = active ? -.055 : 0
    const speed = reducedRef.current ? 80 : 12
    const step = Math.min(dt, .05)
    animated.position.y = THREE.MathUtils.damp(animated.position.y, y, speed, step)
    animated.position.z = THREE.MathUtils.damp(animated.position.z, z, speed, step)
    animated.rotation.x = THREE.MathUtils.damp(animated.rotation.x, tip, speed, step)
    if (Math.abs(animated.position.y - y) > .0007 ||
        Math.abs(animated.position.z - z) > .0007 ||
        Math.abs(animated.rotation.x - tip) > .0007) invalidate()
  })

  function projectedCover(): BookScreenOrigin | undefined {
    const plane = coverRef.current
    if (!plane) return
    plane.updateWorldMatrix(true, false)
    camera.updateWorldMatrix(true, false)
    const bounds = gl.domElement.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    // Exact corners of the FRONT artwork, including tilt, thickness and hover
    // offset. Project them to viewport pixels so the overlay can FLIP outward.
    const hw = (w - .008) / 2
    const hh = (h - .008) / 2
    const corners = [
      [-hw, -hh], [-hw, hh], [hw, -hh], [hw, hh],
    ] as const
    const pixels = corners.map(([x, y]) => {
      const point = plane.localToWorld(new THREE.Vector3(x, y, 0)).project(camera)
      return {
        x: bounds.left + (point.x + 1) * bounds.width / 2,
        y: bounds.top + (1 - point.y) * bounds.height / 2,
      }
    })
    const minX = Math.min(...pixels.map(p => p.x))
    const minY = Math.min(...pixels.map(p => p.y))
    const maxX = Math.max(...pixels.map(p => p.x))
    const maxY = Math.max(...pixels.map(p => p.y))
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
  }

  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    // Do not open a book when the user finishes an OrbitControls drag.
    if (event.delta > 6) return
    onSelect(book, projectedCover())
  }
  return (
    <group
      position={[position[0], position[1] + h / 2, position[2]]}
      rotation={[0, rotation, order % 7 === 4 ? -.025 : .005]}
      visible={!selected}
      onClick={click}
      onPointerOver={event => {
        event.stopPropagation()
        if (event.pointerType === 'touch' || selected) return
        hoverRef.current = true
        setHovered(true)
        invalidate()
      }}
      onPointerOut={event => {
        event.stopPropagation()
        hoverRef.current = false
        setHovered(false)
        invalidate()
      }}
    >
      <group ref={animatedRef}>
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
        <mesh position={[-w / 2 + .019,0,0]} castShadow>
          <cylinderGeometry args={[d*.485,d*.485,h-.018,16,1,false,Math.PI*.45,Math.PI*.92]}/>
          <meshStandardMaterial color={shade} roughness={.8}/>
        </mesh>
        {/* The fore-edge resolves into compressed signatures, not one white bar. */}
        {Array.from({length:5},(_,i)=>(
          <Block key={i} position={[w/2-.014,0,-d*.36 + i*d*.18]} size={[.007,h-.08,.004]} color={i%2?'#cdbfa3':'#fff3d7'} castShadow={false}/>
        ))}
        <mesh ref={coverRef} position={[0, 0, d / 2 + .004]} castShadow>
          <planeGeometry args={[w - .008, h - .008]} />
          <meshStandardMaterial map={cover} roughness={.72} metalness={0} side={THREE.FrontSide} />
        </mesh>
        <Block position={[0, 0, -d / 2 - .005]} size={[w, h, .009]} color={shade} castShadow={false} />
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
  onSelect: (book: Book, origin?: BookScreenOrigin) => void
  saved: Book[]
}) {
  const arranged = useMemo(() => {
    // Every volume is backed by one catalogue record and shown exactly once.
    // Saved titles occupy the central personal shelf; overflow remains real.
    const savedIds = new Set(saved.map(book => book.id))
    const kept = books.filter(book => savedIds.has(book.id))
    const personal = kept.slice(0, 6)
    const rest = [...kept.slice(6), ...books.filter(book => !savedIds.has(book.id))]
    const upperCount = Math.ceil(rest.length / 2)
    return [rest.slice(0, upperCount), personal, rest.slice(upperCount)]
  }, [saved])

  return (
    <group>
      {arranged.map((row, rowIndex) => {
        const y = ROW_BASES[rowIndex]
        return (
          <group key={rowIndex}>
            {row.map((book, index) => (
              <Suspense key={book.id} fallback={null}>
                <BookVolume
                  book={book}
                  position={[FRAME_X + (index - (row.length - 1) / 2) * 1.05, y, -.93]}
                  rotation={index % 4 === 1 ? -.09 : index % 4 === 2 ? .075 : -.015}
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
      <mesh position={[2.12, 1.47, -.97]} castShadow>
        <cylinderGeometry args={[.22, .16, .48, 16]} />
        <meshStandardMaterial color="#d8cabc" roughness={.97} />
      </mesh>
      <mesh position={[2.12, 1.75, -.97]}>
        <cylinderGeometry args={[.09, .09, .06, 16]} />
        <meshStandardMaterial color="#e8d8c7" roughness={.95} />
      </mesh>
    </group>
  )
}

/**
 * A draw-ack for the parent reverse-FLIP. React's commit has restored the
 * volume, an explicit invalidate has requested a WebGL paint, and useFrame
 * runs inside that actual draw. ACK in the following browser frame so the
 * parked overlay cover is never removed before the restored pixels appear.
 */
function RestorationPaintAck({ selectedId, onBookRestored }: {
  selectedId: string | null
  onBookRestored?: (bookId: string) => void
}) {
  const previous = useRef(selectedId)
  const pending = useRef<string | null>(null)
  const callback = useRef(onBookRestored)
  const raf = useRef<number | null>(null)
  const { invalidate } = useThree()
  callback.current = onBookRestored
  useLayoutEffect(() => {
    const last = previous.current
    previous.current = selectedId
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current)
      raf.current = null
    }
    pending.current = last && selectedId === null ? last : null
    if (pending.current) invalidate()
  }, [selectedId, invalidate])
  useFrame(() => {
    if (!pending.current) return
    const restoredId = pending.current
    pending.current = null
    // R3F draws immediately after its useFrame hooks. This next rAF executes
    // after that canvas frame was submitted; parent keeps its source parked
    // until this callback, preventing the sub-frame close flash.
    raf.current = requestAnimationFrame(() => {
      raf.current = null
      callback.current?.(restoredId)
    })
  })
  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current)
  }, [])
  return null
}

function LibraryScene({ saved, selectedId, onSelect, onBookRestored, compact }: LibraryRoomProps & { compact: boolean }) {
  const oak = useMemo(() => makeGrain('oak'), [])
  const oakHorizontal = useMemo(() => {
    const result = oak.clone()
    result.center.set(.5,.5)
    result.rotation = Math.PI / 2
    result.needsUpdate = true
    return result
  }, [oak])
  const plaster = useMemo(() => makeGrain('plaster'), [])
  const stone = useMemo(() => makeGrain('travertine'), [])
  const linen = useMemo(() => makeGrain('linen'), [])
  const outside = useMemo(() => makeGrain('outside'), [])
  useEffect(() => () => {
    oak.dispose()
    oakHorizontal.dispose()
    plaster.dispose()
    stone.dispose()
    linen.dispose()
    outside.dispose()
  }, [oak, oakHorizontal, plaster, stone, linen, outside])

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={compact ? [.4, 2.5, 16.05] : [-.05, 2.2, 12.35]}
        fov={compact ? 40 : 37.5}
        near={.1}
        far={65}
      />
      <color attach="background" args={['#e2d7c6']} />
      <ambientLight intensity={.49} color="#ffedda" />
      <hemisphereLight args={['#e2e9e6', '#8c6e51', .78]} />
      <directionalLight
        castShadow
        position={[6.4, 9.5, 8]}
        color="#fff0d9"
        intensity={2.65}
        shadow-mapSize={[compact ? 768 : 1024, compact ? 768 : 1024]}
        shadow-bias={-.00012}
        shadow-normalBias={.025}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-radius={3}
      />
      <spotLight position={[-1.4, 5.9, 3.8]} color="#ffe7cc" intensity={15} angle={.7} penumbra={.9} distance={15} decay={2} />
      <RoomShell oak={oak} oakHorizontal={oakHorizontal} plaster={plaster} stone={stone} />
      <LibraryCabinet oak={oak} oakHorizontal={oakHorizontal} />
      <WindowAndSconce oak={oak} stone={stone} outside={outside} />
      <ShelfContents saved={saved} selectedId={selectedId} onSelect={onSelect} />
      <ReadingChair oak={oak} linen={linen} />
      <SideTable oak={oak} stone={stone} />
      <RestorationPaintAck selectedId={selectedId} onBookRestored={onBookRestored} />
      <OrbitControls
        makeDefault
        target={compact ? [.36, -.55, -1.15] : [-.15, -.55, -1.15]}
        enablePan={false}
        enableDamping
        dampingFactor={.065}
        rotateSpeed={compact ? .33 : .42}
        zoomSpeed={.44}
        minDistance={compact ? 11.5 : 9.7}
        maxDistance={compact ? 21 : 19}
        minPolarAngle={.95}
        maxPolarAngle={1.62}
        minAzimuthAngle={-.3}
        maxAzimuthAngle={.3}
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

export default function LibraryRoom3D({ saved, selectedId, onSelect, onBookRestored, className = '' }: LibraryRoomProps) {
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
            <LibraryScene saved={saved} selectedId={selectedId} onSelect={onSelect} onBookRestored={onBookRestored} compact={compact} />
          </Canvas>
        </WebGLGuard>
      )}
    </div>
  )
}

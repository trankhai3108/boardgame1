import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { feltTexture } from './feltTexture';
import { TABLE, TABLE_H } from './scene';

/**
 * The room and the table in it.
 *
 * Everything here is scenery — nothing reads or changes the game — but it is
 * what makes the pieces feel put down rather than drawn. The table has a rim
 * you can see the thickness of, it stands on a floor that catches its shadow,
 * and the light comes from above it the way a lamp over a table does.
 */
export function Table3D() {
  const felt = useMemo(() => feltTexture(), []);

  return (
    <group>
      {/* Light: one lamp over the middle, plus enough fill to read a board by. */}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#cfd6e6', '#2a2118', 0.6]} />
      <directionalLight
        position={[1.3, 3.1, 1.6]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-2.2}
        shadow-camera-right={2.2}
        shadow-camera-top={2.2}
        shadow-camera-bottom={-2.2}
        shadow-bias={-0.0005}
      />
      <pointLight position={[0, TABLE_H + 1.1, 0]} intensity={2.2} distance={4} decay={2} />

      {/* The floor, far enough down to be felt rather than looked at. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#14131a" roughness={0.96} />
      </mesh>

      {/* The table top. */}
      <mesh position={[0, TABLE_H - TABLE.thickness / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[TABLE.radius, TABLE.radius, TABLE.thickness, 64]} />
        <meshStandardMaterial color="#3b2a1b" roughness={0.72} metalness={0.04} />
      </mesh>

      {/* The felt, a shade proud of the wood so the rim stays visible. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_H + 0.001, 0]} receiveShadow>
        <circleGeometry args={[TABLE.feltRadius, 64]} />
        {felt ? (
          <meshStandardMaterial map={felt} roughness={0.95} />
        ) : (
          <meshStandardMaterial color="#3a2d11" roughness={0.95} />
        )}
      </mesh>

      {/* A pedestal, so the table does not float. */}
      <mesh position={[0, (TABLE_H - TABLE.thickness) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.26, TABLE_H - TABLE.thickness, 24]} />
        <meshStandardMaterial color="#2b2018" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.46, 0.5, 0.04, 32]} />
        <meshStandardMaterial color="#241b14" roughness={0.85} />
      </mesh>

      {/* The dark beyond the lamp, which keeps the eye on the table. */}
      <mesh>
        <sphereGeometry args={[9, 24, 16]} />
        <meshBasicMaterial color="#0a0a10" side={DoubleSide} />
      </mesh>
    </group>
  );
}

import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Float,
  Environment,
  ContactShadows,
  Sparkles,
  Sphere,
  RoundedBox,
  Torus,
} from '@react-three/drei';
import * as THREE from 'three';

interface ToothKawaiiModelProps {
  animation: string;
}

function ToothKawaiiModel({ animation }: ToothKawaiiModelProps) {
  const bodyRef  = useRef<THREE.Group>(null);
  const leftArm  = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const eyeGroup = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Reset
    if (bodyRef.current) {
      bodyRef.current.position.set(0, 0, 0);
      bodyRef.current.rotation.set(0, 0, 0);
    }
    if (leftArm.current) leftArm.current.rotation.set(0, 0, 0.65);
    if (rightArm.current) rightArm.current.rotation.set(0, 0, -0.15);

    // Animaciones
    switch (animation) {
      case 'salto_mortal': // voltereta atrás
        if (bodyRef.current) {
          bodyRef.current.position.y = Math.abs(Math.sin(t * 2)) * 0.7;
          bodyRef.current.rotation.x = Math.PI * 2 * (t % 1);
        }
        break;
      case 'salto_alto':
        if (bodyRef.current) {
          bodyRef.current.position.y = Math.abs(Math.sin(t * 3)) * 0.9;
        }
        if (leftArm.current) leftArm.current.rotation.z = 1.5 + Math.sin(t * 6) * 0.2;
        if (rightArm.current) rightArm.current.rotation.z = -1.5 + Math.sin(t * 6) * 0.2;
        break;
      case 'giro':
        if (bodyRef.current) {
          bodyRef.current.rotation.y = Math.PI * 2 * (t % 1);
        }
        break;
      case 'salto_divertido':
        if (bodyRef.current) {
          bodyRef.current.position.y = Math.abs(Math.sin(t * 2.5)) * 0.5;
        }
        if (leftArm.current) leftArm.current.rotation.z = 2.2 + Math.sin(t * 5) * 0.3;
        if (rightArm.current) rightArm.current.rotation.z = -2.2 + Math.sin(t * 5) * 0.3;
        break;
      default: // idle
        if (bodyRef.current) {
          bodyRef.current.position.y = Math.sin(t * 2.2) * 0.05;
          bodyRef.current.rotation.z = Math.sin(t * 1.1) * 0.018;
        }
        if (leftArm.current)  leftArm.current.rotation.z  = Math.sin(t * 5.5) * 0.35 + 0.65;
        if (rightArm.current) rightArm.current.rotation.z = -0.15 + Math.sin(t * 1.8) * 0.08;
        break;
    }
    if (eyeGroup.current) {
      if (Math.random() > 0.993) eyeGroup.current.scale.y = 0.06;
      else eyeGroup.current.scale.y = THREE.MathUtils.lerp(eyeGroup.current.scale.y, 1, 0.35);
    }
  });

  const toothMat = new THREE.MeshPhysicalMaterial({ color: '#eefaff', roughness: 0.12, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.08, reflectivity: 0.6 });
  const eyeMat   = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.1 });
  const irisMat  = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.2, emissive: '#0ea5e9', emissiveIntensity: 0.4 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.8 });
  const tongueMat= new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.4 });

  return (
    <Float speed={2.2} rotationIntensity={0.07} floatIntensity={0.35} floatingRange={[-0.05, 0.05]}>
      <group ref={bodyRef}>

        {/* CORONA */}
        <RoundedBox args={[1.35, 0.85, 0.78]} radius={0.18} smoothness={5} position={[0, 0.18, 0]}>
          <primitive object={toothMat} />
        </RoundedBox>
        {/* 4 c�spides */}
        <Sphere args={[0.23, 32, 32]} position={[-0.38, 0.72, 0.15]}><primitive object={toothMat} /></Sphere>
        <Sphere args={[0.23, 32, 32]} position={[ 0.38, 0.72, 0.15]}><primitive object={toothMat} /></Sphere>
        <Sphere args={[0.23, 32, 32]} position={[-0.38, 0.72,-0.15]}><primitive object={toothMat} /></Sphere>
        <Sphere args={[0.23, 32, 32]} position={[ 0.38, 0.72,-0.15]}><primitive object={toothMat} /></Sphere>
        <Sphere args={[0.28, 32, 32]} position={[0, 0.72, 0]}><primitive object={toothMat} /></Sphere>

        {/* CUELLO */}
        <Sphere args={[0.5, 32, 32]} position={[0, -0.22, 0]} scale={[1.05, 0.55, 0.88]}>
          <primitive object={toothMat} />
        </Sphere>

        {/* RA�CES */}
        <group position={[-0.33,-0.52, 0]} rotation={[0,0,0.13]}>
          <Sphere args={[0.21, 32, 32]} scale={[1, 3.0, 0.95]}><primitive object={toothMat} /></Sphere>
        </group>
        <group position={[ 0.33,-0.52, 0]} rotation={[0,0,-0.13]}>
          <Sphere args={[0.21, 32, 32]} scale={[1, 3.0, 0.95]}><primitive object={toothMat} /></Sphere>
        </group>

        {/* BRAZOS */}
        <group ref={leftArm}  position={[-0.78, 0.12, 0.05]} rotation={[0, 0, 0.65]}>
          <Sphere args={[0.1,16,16]} position={[0,0.18,0]} scale={[1,2.2,1]}><primitive object={toothMat} /></Sphere>
          <Sphere args={[0.13,16,16]} position={[0,0.42,0]}><primitive object={toothMat} /></Sphere>
        </group>
        <group ref={rightArm} position={[ 0.78, 0.05, 0.05]} rotation={[0, 0,-0.15]}>
          <Sphere args={[0.1,16,16]} position={[0,-0.16,0]} scale={[1,2.2,1]}><primitive object={toothMat} /></Sphere>
          <Sphere args={[0.13,16,16]} position={[0,-0.38,0]}><primitive object={toothMat} /></Sphere>
        </group>

        {/* CARA */}
        <group position={[0, 0.2, 0.43]}>
          <group ref={eyeGroup} position={[0, 0.04, 0]}>
            {/* Ojo izq */}
            <group position={[-0.25, 0, 0]}>
              <Sphere args={[0.135,32,32]} scale={[1,1.3,0.35]}><primitive object={eyeMat} /></Sphere>
              <Sphere args={[0.08,32,32]} position={[0,-0.025,0.04]} scale={[1,0.85,0.25]}><primitive object={irisMat} /></Sphere>
              <Sphere args={[0.045,16,16]} position={[-0.05,0.05,0.045]} scale={[1,1,0.4]}><meshBasicMaterial color="white" /></Sphere>
              <Sphere args={[0.022,16,16]} position={[0.04,-0.02,0.045]}><meshBasicMaterial color="white" /></Sphere>
            </group>
            {/* Ojo der */}
            <group position={[0.25, 0, 0]}>
              <Sphere args={[0.135,32,32]} scale={[1,1.3,0.35]}><primitive object={eyeMat} /></Sphere>
              <Sphere args={[0.08,32,32]} position={[0,-0.025,0.04]} scale={[1,0.85,0.25]}><primitive object={irisMat} /></Sphere>
              <Sphere args={[0.045,16,16]} position={[-0.05,0.05,0.045]} scale={[1,1,0.4]}><meshBasicMaterial color="white" /></Sphere>
              <Sphere args={[0.022,16,16]} position={[0.04,-0.02,0.045]}><meshBasicMaterial color="white" /></Sphere>
            </group>
          </group>

          {/* Cachetes */}
          <Sphere args={[0.1,16,16]} position={[-0.42,-0.1,0.02]} scale={[1.3,0.75,0.45]}><meshBasicMaterial color="#fda4af" transparent opacity={0.55}/></Sphere>
          <Sphere args={[0.1,16,16]} position={[ 0.42,-0.1,0.02]} scale={[1.3,0.75,0.45]}><meshBasicMaterial color="#fda4af" transparent opacity={0.55}/></Sphere>

          {/* Boca */}
          <group position={[0,-0.2,0.02]}>
            <Torus args={[0.155,0.028,16,48,Math.PI]} rotation={[0,0,Math.PI]} position={[0,0.03,0.02]}>
              <primitive object={eyeMat} />
            </Torus>
            <Sphere args={[0.11,32,32]} scale={[1.35,0.6,0.28]} position={[0,-0.025,0]}><primitive object={mouthMat} /></Sphere>
            <Sphere args={[0.065,16,16]} position={[0,-0.065,0.005]} scale={[1.1,0.55,0.5]}><primitive object={tongueMat} /></Sphere>
          </group>
        </group>

      </group>
    </Float>
  );
}

export function BotFace() {
  const animations = ['idle', 'salto_mortal', 'salto_alto', 'giro', 'salto_divertido'];
  const [animation, setAnimation] = useState<string>('idle');

  useEffect(() => {
    let idleTimeout: NodeJS.Timeout;
    let animTimeout: NodeJS.Timeout;

    if (animation === 'idle') {
      idleTimeout = setTimeout(() => {
        // Elegir animación aleatoria (no idle)
        const anims = animations.filter(a => a !== 'idle');
        const next = anims[Math.floor(Math.random() * anims.length)];
  setAnimation(next || 'idle');
      }, 20000);
    } else {
      // Animación dura 2 segundos, luego vuelve a idle
      animTimeout = setTimeout(() => {
        setAnimation('idle');
      }, 2000);
    }

    return () => {
      clearTimeout(idleTimeout);
      clearTimeout(animTimeout);
    };
  }, [animation]);

  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 0.1, 6], fov: 52 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={1.3} />
        <spotLight position={[6, 8, 8]} angle={0.4} penumbra={1} intensity={1.8} color="white" />
        <pointLight position={[-6, -4, -4]} intensity={0.5} color="#bae6fd" />
        <Environment preset="studio" />
        <Sparkles count={14} scale={5} size={1.8} speed={0.4} opacity={0.35} color="#7dd3fc" position={[0, 0, -1.5]} />
        <ToothKawaiiModel animation={animation} />
        <ContactShadows position={[0, -2.0, 0]} opacity={0.18} scale={8} blur={2.5} far={5} color="#000000" />
      </Canvas>
    </div>
  );
}

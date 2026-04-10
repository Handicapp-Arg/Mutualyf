import { memo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Float,
  Environment,
  ContactShadows,
  Sphere,
  RoundedBox,
  Torus,
} from '@react-three/drei';
import * as THREE from 'three';

interface ToothKawaiiModelProps {
  animation: string;
}

function ToothKawaiiModel({ animation }: ToothKawaiiModelProps) {
  const bodyRef = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const eyeGroup = useRef<THREE.Group>(null);
  const lastAnim = useRef<string>('idle');
  const blend = useRef<number>(0); // 0: idle, 1: anim
  const blendSpeed = 0.18; // blending rápido
  const [holdAnim, setHoldAnim] = useState(false); // mantener pose final
  const holdTimer = useRef<number | null>(null);

  useEffect(() => {
    // Cuando termina la animación, mantener la pose final 0.25s antes de volver a idle
    if (animation !== 'idle') {
      setHoldAnim(false);
      if (holdTimer.current) clearTimeout(holdTimer.current);
    } else if (lastAnim.current !== 'idle') {
      setHoldAnim(true);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = window.setTimeout(() => {
        setHoldAnim(false);
        lastAnim.current = 'idle';
      }, 250); // 250ms en pose final
    }
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, [animation]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Blending animación
    if (animation !== lastAnim.current && animation !== 'idle') {
      blend.current += blendSpeed;
      if (blend.current > 1) blend.current = 1;
      if (blend.current === 1) lastAnim.current = animation;
    } else if (animation === 'idle' && !holdAnim && blend.current > 0) {
      blend.current -= blendSpeed;
      if (blend.current < 0) blend.current = 0;
    }

    // Estados base
    // Idle
    const idle = {
      posY: Math.sin(t * 2.2) * 0.05,
      rotX: 0,
      rotY: 0,
      rotZ: Math.sin(t * 1.1) * 0.018,
      leftArm: Math.sin(t * 5.5) * 0.35 + 0.65,
      rightArm: -0.15 + Math.sin(t * 1.8) * 0.08,
    };
    // Animación destino
    let anim = { ...idle };
    switch (animation !== 'idle' ? animation : lastAnim.current) {
      case 'salto_mortal':
        anim.posY = Math.abs(Math.sin(t * 2)) * 0.7;
        anim.rotX = Math.PI * 2 * (t % 1);
        break;
      case 'salto_alto':
        anim.posY = Math.abs(Math.sin(t * 3)) * 0.9;
        anim.leftArm = 1.5 + Math.sin(t * 6) * 0.2;
        anim.rightArm = -1.5 + Math.sin(t * 6) * 0.2;
        break;
      case 'giro':
        anim.rotY = Math.PI * 2 * (t % 1);
        break;
      case 'salto_divertido':
        anim.posY = Math.abs(Math.sin(t * 2.5)) * 0.5;
        anim.leftArm = 2.2 + Math.sin(t * 5) * 0.3;
        anim.rightArm = -2.2 + Math.sin(t * 5) * 0.3;
        break;
    }

    // Interpolación suave entre idle y animación
    const b = blend.current;
    const lerp = THREE.MathUtils.lerp;
    if (bodyRef.current) {
      bodyRef.current.position.y = lerp(idle.posY, anim.posY, b);
      bodyRef.current.rotation.x = lerp(idle.rotX, anim.rotX, b);
      bodyRef.current.rotation.y = lerp(idle.rotY, anim.rotY, b);
      bodyRef.current.rotation.z = lerp(idle.rotZ, anim.rotZ, b);
    }
    if (leftArm.current) leftArm.current.rotation.z = lerp(idle.leftArm, anim.leftArm, b);
    if (rightArm.current)
      rightArm.current.rotation.z = lerp(idle.rightArm, anim.rightArm, b);

    // Ojos (blink)
    if (eyeGroup.current) {
      if (Math.random() > 0.993) eyeGroup.current.scale.y = 0.06;
      else
        eyeGroup.current.scale.y = THREE.MathUtils.lerp(
          eyeGroup.current.scale.y,
          1,
          0.35
        );
    }
  });

  const toothMat = new THREE.MeshPhysicalMaterial({
    color: '#eefaff',
    roughness: 0.12,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.6,
  });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.1 });
  const irisMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    roughness: 0.2,
    emissive: '#0ea5e9',
    emissiveIntensity: 0.4,
  });
  const mouthMat = new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.8 });
  const tongueMat = new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.4 });

  return (
    <Float
      speed={2.2}
      rotationIntensity={0.07}
      floatIntensity={0.35}
      floatingRange={[-0.05, 0.05]}
    >
      <group ref={bodyRef}>
        {/* CORONA */}
        <RoundedBox
          args={[1.35, 0.85, 0.78]}
          radius={0.18}
          smoothness={5}
          position={[0, 0.18, 0]}
        >
          <primitive object={toothMat} />
        </RoundedBox>
        {/* 4 c�spides */}
        <Sphere args={[0.23, 32, 32]} position={[-0.38, 0.72, 0.15]}>
          <primitive object={toothMat} />
        </Sphere>
        <Sphere args={[0.23, 32, 32]} position={[0.38, 0.72, 0.15]}>
          <primitive object={toothMat} />
        </Sphere>
        <Sphere args={[0.23, 32, 32]} position={[-0.38, 0.72, -0.15]}>
          <primitive object={toothMat} />
        </Sphere>
        <Sphere args={[0.23, 32, 32]} position={[0.38, 0.72, -0.15]}>
          <primitive object={toothMat} />
        </Sphere>
        <Sphere args={[0.28, 32, 32]} position={[0, 0.72, 0]}>
          <primitive object={toothMat} />
        </Sphere>

        {/* CUELLO */}
        <Sphere args={[0.5, 32, 32]} position={[0, -0.22, 0]} scale={[1.05, 0.55, 0.88]}>
          <primitive object={toothMat} />
        </Sphere>

        {/* RA�CES */}
        <group position={[-0.33, -0.52, 0]} rotation={[0, 0, 0.13]}>
          <Sphere args={[0.21, 32, 32]} scale={[1, 3.0, 0.95]}>
            <primitive object={toothMat} />
          </Sphere>
        </group>
        <group position={[0.33, -0.52, 0]} rotation={[0, 0, -0.13]}>
          <Sphere args={[0.21, 32, 32]} scale={[1, 3.0, 0.95]}>
            <primitive object={toothMat} />
          </Sphere>
        </group>

        {/* BRAZOS */}
        <group ref={leftArm} position={[-0.78, 0.12, 0.05]} rotation={[0, 0, 0.65]}>
          <Sphere args={[0.1, 16, 16]} position={[0, 0.18, 0]} scale={[1, 2.2, 1]}>
            <primitive object={toothMat} />
          </Sphere>
          <Sphere args={[0.13, 16, 16]} position={[0, 0.42, 0]}>
            <primitive object={toothMat} />
          </Sphere>
        </group>
        <group ref={rightArm} position={[0.78, 0.05, 0.05]} rotation={[0, 0, -0.15]}>
          <Sphere args={[0.1, 16, 16]} position={[0, -0.16, 0]} scale={[1, 2.2, 1]}>
            <primitive object={toothMat} />
          </Sphere>
          <Sphere args={[0.13, 16, 16]} position={[0, -0.38, 0]}>
            <primitive object={toothMat} />
          </Sphere>
        </group>

        {/* CARA */}
        <group position={[0, 0.2, 0.43]}>
          <group ref={eyeGroup} position={[0, 0.04, 0]}>
            {/* Ojo izq */}
            <group position={[-0.25, 0, 0]}>
              <Sphere args={[0.135, 32, 32]} scale={[1, 1.3, 0.35]}>
                <primitive object={eyeMat} />
              </Sphere>
              <Sphere
                args={[0.08, 32, 32]}
                position={[0, -0.025, 0.04]}
                scale={[1, 0.85, 0.25]}
              >
                <primitive object={irisMat} />
              </Sphere>
              <Sphere
                args={[0.045, 16, 16]}
                position={[-0.05, 0.05, 0.045]}
                scale={[1, 1, 0.4]}
              >
                <meshBasicMaterial color="white" />
              </Sphere>
              <Sphere args={[0.022, 16, 16]} position={[0.04, -0.02, 0.045]}>
                <meshBasicMaterial color="white" />
              </Sphere>
            </group>
            {/* Ojo der */}
            <group position={[0.25, 0, 0]}>
              <Sphere args={[0.135, 32, 32]} scale={[1, 1.3, 0.35]}>
                <primitive object={eyeMat} />
              </Sphere>
              <Sphere
                args={[0.08, 32, 32]}
                position={[0, -0.025, 0.04]}
                scale={[1, 0.85, 0.25]}
              >
                <primitive object={irisMat} />
              </Sphere>
              <Sphere
                args={[0.045, 16, 16]}
                position={[-0.05, 0.05, 0.045]}
                scale={[1, 1, 0.4]}
              >
                <meshBasicMaterial color="white" />
              </Sphere>
              <Sphere args={[0.022, 16, 16]} position={[0.04, -0.02, 0.045]}>
                <meshBasicMaterial color="white" />
              </Sphere>
            </group>
          </group>

          {/* Cachetes */}
          <Sphere
            args={[0.1, 16, 16]}
            position={[-0.42, -0.1, 0.02]}
            scale={[1.3, 0.75, 0.45]}
          >
            <meshBasicMaterial color="#fda4af" transparent opacity={0.55} />
          </Sphere>
          <Sphere
            args={[0.1, 16, 16]}
            position={[0.42, -0.1, 0.02]}
            scale={[1.3, 0.75, 0.45]}
          >
            <meshBasicMaterial color="#fda4af" transparent opacity={0.55} />
          </Sphere>

          {/* Boca */}
          <group position={[0, -0.2, 0.02]}>
            <Torus
              args={[0.155, 0.028, 16, 48, Math.PI]}
              rotation={[0, 0, Math.PI]}
              position={[0, 0.03, 0.02]}
            >
              <primitive object={eyeMat} />
            </Torus>
            <Sphere
              args={[0.11, 32, 32]}
              scale={[1.35, 0.6, 0.28]}
              position={[0, -0.025, 0]}
            >
              <primitive object={mouthMat} />
            </Sphere>
            <Sphere
              args={[0.065, 16, 16]}
              position={[0, -0.065, 0.005]}
              scale={[1.1, 0.55, 0.5]}
            >
              <primitive object={tongueMat} />
            </Sphere>
          </group>
        </group>
      </group>
    </Float>
  );
}

export const BotFace = memo(function BotFace() {
  const animations = ['idle', 'salto_mortal', 'salto_alto', 'giro', 'salto_divertido'];
  const [animation, setAnimation] = useState<string>('idle');

  useEffect(() => {
    let idleTimeout: NodeJS.Timeout;
    let animTimeout: NodeJS.Timeout;

    if (animation === 'idle') {
      idleTimeout = setTimeout(() => {
        // Elegir animación aleatoria (no idle)
        const anims = animations.filter((a) => a !== 'idle');
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
      <Canvas
        camera={{ position: [0, 0.1, 6], fov: 52 }}
        dpr={[1, 2]} // Mejora la nitidez en pantallas retina
        gl={{
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#000000'), 0); // Fondo transparente absoluto
        }}
      >
        <ambientLight intensity={1.5} />
        {/* Luz principal frontal-superior */}
        <spotLight
          position={[6, 8, 8]}
          angle={0.4}
          penumbra={1}
          intensity={1.8}
          castShadow
          shadow-bias={-0.0001}
        />
        {/* Luz de relleno suave azulada */}
        <pointLight position={[-6, -4, -4]} intensity={0.5} color="#bae6fd" />
        {/* Luz trasera (Rim Light) para separar del fondo blanco */}
        <pointLight position={[0, 2, -4]} intensity={1.2} color="#ffffff" distance={10} />

        <Environment preset="studio" />
        <ToothKawaiiModel animation={animation} />
        {/* Sombras suaves de contacto mejoradas para fondo claro */}
        <ContactShadows
          resolution={1024}
          scale={10}
          blur={3}
          opacity={0.2}
          far={10}
          color="#000000"
        />
      </Canvas>
    </div>
  );
});

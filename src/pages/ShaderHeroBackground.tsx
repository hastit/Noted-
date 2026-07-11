import React, {Component, useEffect, useState} from 'react';
import {ShaderGradient, ShaderGradientCanvas} from 'shadergradient';

const gradientProps = {
  animate: 'on' as const,
  axesHelper: 'off',
  brightness: 1.1,
  cAzimuthAngle: 180,
  cDistance: 3.6,
  cPolarAngle: 90,
  cameraZoom: 1,
  color1: '#F57799',
  color2: '#dbba95',
  color3: '#FAAC68',
  destination: 'onCanvas',
  embedMode: 'off',
  envPreset: 'city' as const,
  format: 'gif',
  fov: 45,
  frameRate: 10,
  gizmoHelper: 'hide',
  grain: 'on' as const,
  lightType: '3d' as const,
  pixelDensity: 1,
  positionX: -1.4,
  positionY: 0,
  positionZ: 0,
  range: 'disabled',
  rangeEnd: 40,
  rangeStart: 0,
  reflection: 0.1,
  rotationX: 0,
  rotationY: 10,
  rotationZ: 50,
  shader: 'defaults',
  type: 'waterPlane' as const,
  uAmplitude: 1,
  uDensity: 1.3,
  uFrequency: 5.5,
  uSpeed: 0.1,
  uStrength: 4,
  uTime: 0,
  wireframe: false,
};

function StaticGradientFallback() {
  return (
    <div
      className="absolute inset-0 z-0 bg-gradient-to-br from-[#F57799] via-[#dbba95] to-[#FAAC68]"
      aria-hidden
    />
  );
}

function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl instanceof WebGLRenderingContext;
  } catch {
    return false;
  }
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ShaderErrorBoundary extends Component<{children: React.ReactNode}, ErrorBoundaryState> {
  state: ErrorBoundaryState = {hasError: false};

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {hasError: true};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('ShaderHeroBackground error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <StaticGradientFallback />;
    }
    return this.props.children;
  }
}

function ShaderGradientRenderer() {
  return (
    <ShaderGradientCanvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <ShaderGradient {...gradientProps} />
    </ShaderGradientCanvas>
  );
}

/** Arrière-plan WebGL du hero — chargé en lazy pour ne pas bloquer le premier rendu. */
export default function ShaderHeroBackground() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglSupported(isWebGLAvailable());
  }, []);

  if (webglSupported === null) {
    return <StaticGradientFallback />;
  }

  if (!webglSupported) {
    return <StaticGradientFallback />;
  }

  return (
    <ShaderErrorBoundary>
      <ShaderGradientRenderer />
    </ShaderErrorBoundary>
  );
}

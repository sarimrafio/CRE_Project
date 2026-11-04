import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Bioreactor3D({
  cstrSe = 75,
  pfrSe = 75,
  cstrVolume = 489.7,
  pfrVolume = 494.8,
  removalPct = 90.0,
  activeMode = 'both' // 'both', 'cstr', 'pfr'
}) {
  const mountRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [bubbleSpeed, setBubbleSpeed] = useState(1.0);
  const [viewAngle, setViewAngle] = useState('isometric');

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const impellerRef = useRef(null);
  const cstrLiquidRef = useRef(null);
  const pfrSegmentsRef = useRef([]);
  const bubblesRef = useRef([]);
  const pfrBubblesRef = useRef([]);
  const animFrameIdRef = useRef(null);

  // Mouse interaction state for camera rotation
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 6, radius: 24 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 480;

    // SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120); // Deep modern slate navy
    sceneRef.current = scene;

    // CAMERA
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x60a5fa, 1.2);
    dirLight1.position.set(15, 25, 20);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf472b6, 0.8);
    dirLight2.position.set(-15, -10, -15);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x38bdf8, 1.5, 30);
    pointLight.position.set(-6, 2, 0);
    scene.add(pointLight);

    // GRID & GROUND
    const gridHelper = new THREE.GridHelper(30, 30, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -6;
    scene.add(gridHelper);

    // ==========================================
    // 1. CSTR ASSEMBLY (LEFT SIDE: x = -6.5)
    // ==========================================
    const cstrGroup = new THREE.Group();
    cstrGroup.position.set(-6.5, 0, 0);
    scene.add(cstrGroup);

    // Outer Glass Tank
    const tankGeo = new THREE.CylinderGeometry(3.2, 3.2, 7.0, 32, 1, true);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      ior: 1.4,
      side: THREE.DoubleSide,
      wireframe: wireframe
    });
    const tankMesh = new THREE.Mesh(tankGeo, glassMat);
    tankMesh.position.y = 0;
    cstrGroup.add(tankMesh);

    // Tank Metallic Rings (Top and Bottom Flanges)
    const ringGeo = new THREE.TorusGeometry(3.25, 0.12, 16, 32);
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25
    });
    const topRing = new THREE.Mesh(ringGeo, metalMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 3.5;
    cstrGroup.add(topRing);

    const botRing = topRing.clone();
    botRing.position.y = -3.5;
    cstrGroup.add(botRing);

    // Liquid Body in CSTR
    const liquidGeo = new THREE.CylinderGeometry(3.1, 3.1, 6.2, 32);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: getLiquidColor(cstrSe),
      transparent: true,
      opacity: 0.65,
      roughness: 0.2,
      wireframe: wireframe
    });
    const cstrLiquid = new THREE.Mesh(liquidGeo, liquidMat);
    cstrLiquid.position.y = -0.4;
    cstrGroup.add(cstrLiquid);
    cstrLiquidRef.current = cstrLiquid;

    // Central Agitator Shaft & Impeller
    const impellerGroup = new THREE.Group();
    const shaftGeo = new THREE.CylinderGeometry(0.12, 0.12, 7.8, 16);
    const shaftMesh = new THREE.Mesh(shaftGeo, metalMat);
    shaftMesh.position.y = 0.5;
    impellerGroup.add(shaftMesh);

    // Impeller Turbine Blades (Rushton turbine)
    const bladeGeo = new THREE.BoxGeometry(0.8, 0.4, 0.08);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(bladeGeo, metalMat);
      blade.rotation.y = (i * Math.PI) / 2;
      blade.position.set(Math.cos(i * Math.PI / 2) * 0.9, -1.8, Math.sin(i * Math.PI / 2) * 0.9);
      impellerGroup.add(blade);
    }
    cstrGroup.add(impellerGroup);
    impellerRef.current = impellerGroup;

    // Aeration Sparger Plate (Bottom)
    const spargerGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 24);
    const spargerMesh = new THREE.Mesh(spargerGeo, metalMat);
    spargerMesh.position.y = -3.2;
    cstrGroup.add(spargerMesh);

    // Animated Aeration Bubbles in CSTR
    const bubbleGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.75
    });
    const cstrBubbles = [];
    for (let i = 0; i < 70; i++) {
      const bMesh = new THREE.Mesh(bubbleGeo, bubbleMat);
      bMesh.position.set(
        (Math.random() - 0.5) * 3.5,
        -3.2 + Math.random() * 5.8,
        (Math.random() - 0.5) * 3.5
      );
      cstrGroup.add(bMesh);
      cstrBubbles.push({
        mesh: bMesh,
        speedY: 0.04 + Math.random() * 0.05,
        wobble: Math.random() * Math.PI * 2
      });
    }
    bubblesRef.current = cstrBubbles;

    // Clarifier Cone & Recycle Pipe for CSTR
    const coneGeo = new THREE.ConeGeometry(2.0, 2.5, 24);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.5,
      roughness: 0.4
    });
    const clarifierCone = new THREE.Mesh(coneGeo, coneMat);
    clarifierCone.rotation.x = Math.PI;
    clarifierCone.position.set(-6.5, -4.8, 0);
    scene.add(clarifierCone);

    // ==========================================
    // 2. PFR ASSEMBLY (RIGHT SIDE: x = 6.5)
    // Serpentine 4-Channel Plug-Flow Bioreactor
    // ==========================================
    const pfrGroup = new THREE.Group();
    pfrGroup.position.set(6.5, 0, 0);
    scene.add(pfrGroup);

    // 4 Serpentine Channels
    const channelLength = 6.8;
    const channelWidth = 1.3;
    const channelHeight = 2.4;
    const pfrSegments = [];

    for (let ch = 0; ch < 4; ch++) {
      const zOffset = (ch - 1.5) * 1.8;
      // Channel Glass Trough
      const boxGeo = new THREE.BoxGeometry(channelLength, channelHeight, channelWidth);
      const frac = ch / 3.0; // 0 = inlet, 1 = outlet
      const segColor = getPFRChannelColor(frac, pfrSe);

      const chMat = new THREE.MeshPhysicalMaterial({
        color: segColor,
        transparent: true,
        opacity: 0.70,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.4,
        wireframe: wireframe
      });
      const segMesh = new THREE.Mesh(boxGeo, chMat);
      segMesh.position.set(0, -1.0, zOffset);
      pfrGroup.add(segMesh);
      pfrSegments.push(segMesh);

      // Channel Outline Frame
      const edges = new THREE.EdgesGeometry(boxGeo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 1.5 });
      const frameLine = new THREE.LineSegments(edges, lineMat);
      frameLine.position.set(0, -1.0, zOffset);
      pfrGroup.add(frameLine);
    }
    pfrSegmentsRef.current = pfrSegments;

    // PFR Aeration Bubbles along length
    const pfrBubbles = [];
    for (let i = 0; i < 80; i++) {
      const bMesh = new THREE.Mesh(bubbleGeo, bubbleMat);
      const chIdx = Math.floor(Math.random() * 4);
      const zOffset = (chIdx - 1.5) * 1.8;
      bMesh.position.set(
        (Math.random() - 0.5) * (channelLength - 0.4),
        -2.0 + Math.random() * 2.0,
        zOffset + (Math.random() - 0.5) * 0.8
      );
      pfrGroup.add(bMesh);
      pfrBubbles.push({
        mesh: bMesh,
        speedY: 0.03 + Math.random() * 0.04,
        speedX: (chIdx % 2 === 0 ? 0.02 : -0.02), // axial flow direction
        minX: -(channelLength / 2) + 0.2,
        maxX: (channelLength / 2) - 0.2
      });
    }
    pfrBubblesRef.current = pfrBubbles;

    // Inlet Pipe (Left) and Outlet Pipe (Right)
    const pipeGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.5, 16);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.3 });
    const inPipe = new THREE.Mesh(pipeGeo, pipeMat);
    inPipe.rotation.z = Math.PI / 2;
    inPipe.position.set(-3.8, 0.2, -2.7);
    pfrGroup.add(inPipe);

    const outPipe = inPipe.clone();
    outPipe.position.set(3.8, -1.5, 2.7);
    pfrGroup.add(outPipe);

    // ==========================================
    // MOUSE DRAG EVENT HANDLERS (ORBIT CONTROLS)
    // ==========================================
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.theta -= dx * 0.008;
      cameraAngleRef.current.phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi + dy * 0.008));
      updateCameraPosition();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(10, Math.min(45, cameraAngleRef.current.radius + e.deltaY * 0.02));
      updateCameraPosition();
    };

    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    mount.addEventListener('wheel', onWheel, { passive: false });

    // RESIZE LISTENER
    const handleResize = () => {
      if (!mountRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // ==========================================
    // RENDER ANIMATION LOOP
    // ==========================================
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (isPlaying) {
        // Rotate CSTR Impeller
        if (impellerRef.current) {
          impellerRef.current.rotation.y += delta * 4.5;
        }

        // Animate CSTR Bubbles
        cstrBubbles.forEach((b) => {
          b.mesh.position.y += b.speedY * bubbleSpeed;
          b.mesh.position.x += Math.sin(clock.getElapsedTime() * 3 + b.wobble) * 0.005;
          if (b.mesh.position.y > 2.5) {
            b.mesh.position.y = -3.2;
            b.mesh.position.x = (Math.random() - 0.5) * 3.0;
            b.mesh.position.z = (Math.random() - 0.5) * 3.0;
          }
        });

        // Animate PFR Bubbles and Streamlines
        pfrBubbles.forEach((b) => {
          b.mesh.position.y += b.speedY * bubbleSpeed;
          b.mesh.position.x += b.speedX * bubbleSpeed;
          if (b.mesh.position.y > 0.1 || b.mesh.position.x < b.minX || b.mesh.position.x > b.maxX) {
            b.mesh.position.y = -2.0;
            b.mesh.position.x = b.speedX > 0 ? b.minX : b.maxX;
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      mount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      mount.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, []);

  // Update camera coordinates from spherical angles
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const x = radius * Math.cos(phi) * Math.sin(theta);
    const y = radius * Math.sin(phi);
    const z = radius * Math.cos(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);

    // Target based on view mode
    if (activeMode === 'cstr') {
      cameraRef.current.lookAt(-6.5, 0, 0);
    } else if (activeMode === 'pfr') {
      cameraRef.current.lookAt(6.5, 0, 0);
    } else {
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  // Color mappings based on substrate/dye concentration
  function getLiquidColor(se) {
    // Reddish-violet azo dye (#9333ea) transitioning to treated amber/cyan (#06b6d4)
    if (se > 400) return new THREE.Color(0x7e22ce); // High dye
    if (se > 150) return new THREE.Color(0xa855f7); // Intermediate
    if (se > 75) return new THREE.Color(0x0284c7);  // Target standard
    return new THREE.Color(0x10b981);               // High purification
  }

  function getPFRChannelColor(fraction, exitSe) {
    // Spatial gradient along PFR length
    if (fraction < 0.25) return new THREE.Color(0x7e22ce); // Inlet raw dye
    if (fraction < 0.50) return new THREE.Color(0x9333ea); // Middle 1
    if (fraction < 0.75) return new THREE.Color(0x0284c7); // Middle 2
    return getLiquidColor(exitSe);                         // Effluent
  }

  // Handle active mode changes
  useEffect(() => {
    updateCameraPosition();
  }, [activeMode]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-slate-900/90 backdrop-blur-md">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-[450px] cursor-grab active:cursor-grabbing" />

      {/* Floating Header Badges */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-lg bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs font-semibold backdrop-blur-md shadow-lg flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
          <span>CSTR: V = {cstrVolume.toFixed(1)} m³</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-lg flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>PFR: V = {pfrVolume.toFixed(1)} m³</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold backdrop-blur-md shadow-lg">
          Removal: {removalPct.toFixed(1)}% bCOD
        </div>
      </div>

      {/* 3D Interactive Controls Overlay */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-2 rounded-xl backdrop-blur-md text-xs text-slate-300">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
        >
          {isPlaying ? 'Pause Agitation' : 'Resume Agitation'}
        </button>
        <button
          onClick={() => {
            cameraAngleRef.current = { theta: Math.PI / 4, phi: Math.PI / 6, radius: 24 };
            updateCameraPosition();
          }}
          className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 font-medium transition"
        >
          Reset Camera
        </button>
        <span className="text-slate-500 ml-2">Drag to orbit • Scroll to zoom</span>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";

export default function TennisReachVisualizer() {
  const real = {
    doublesWidth: 10.97,
    singlesWidth: 8.23,
    halfLength: 11.885,
    serviceLineFromNet: 6.4,
  };

  const scale = 25;
  const courtMargin = 120;
  const outerSpaceX = 80;
  const outerSpaceTop = 100;
  const outerSpaceBottom = 80;

  const court = {
    width: real.doublesWidth * scale,
    height: real.halfLength * 2 * scale,
    singlesInset: ((real.doublesWidth - real.singlesWidth) / 2) * scale,
    netY: real.halfLength * scale,
    serviceOffset: real.serviceLineFromNet * scale,
    centerX: (real.doublesWidth * scale) / 2,
  };

  const playArea = {
    x: outerSpaceX,
    y: outerSpaceTop,
    width: court.width,
    height: court.height,
  };

  const svgWidth = court.width + outerSpaceX * 2;
  const svgHeight = court.height + outerSpaceTop + outerSpaceBottom;

  const doublesLeftX = playArea.x;
  const doublesRightX = playArea.x + court.width;
  const singlesLeftX = playArea.x + court.singlesInset;
  const singlesRightX = playArea.x + court.width - court.singlesInset;
  const baselineTopY = playArea.y;
  const baselineBottomY = playArea.y + court.height;
  const netY = playArea.y + court.netY;
  const topServiceY = playArea.y + court.netY - court.serviceOffset;
  const bottomServiceY = playArea.y + court.netY + court.serviceOffset;
  const centerServiceX = playArea.x + court.centerX;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
  const radToDeg = (rad) => (rad * 180) / Math.PI;

  const [showLayers, setShowLayers] = useState({
    doubles: true,
    singles: true,
    service: true,
  });

  const [players, setPlayers] = useState([
    {
      id: 1,
      name: "P1",
      side: "bottom",
      x: playArea.x + court.centerX - 60,
      y: playArea.y + court.netY + 190,
      color: "#2563eb",
      reach: 110,
      active: true,
    },
    {
      id: 2,
      name: "P2",
      side: "bottom",
      x: playArea.x + court.centerX + 60,
      y: playArea.y + court.netY + 300,
      color: "#0891b2",
      reach: 110,
      active: false,
    },
    {
      id: 3,
      name: "P3",
      side: "top",
      x: playArea.x + court.centerX - 60,
      y: playArea.y + court.netY - 190,
      color: "#dc2626",
      reach: 110,
      active: false,
    },
    {
      id: 4,
      name: "P4",
      side: "top",
      x: playArea.x + court.centerX + 60,
      y: playArea.y + court.netY - 300,
      color: "#ea580c",
      reach: 110,
      active: false,
    },
  ]);

  const [draggingId, setDraggingId] = useState(null); // number = player id, "ball" = ball
  const [ball, setBall] = useState({
    x: playArea.x + court.centerX,
    y: netY,
  });
  const svgRef = useRef(null);

  const [formations, setFormations] = useState(() => {
    try {
      const saved = localStorage.getItem("tennis-formations");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newFormationName, setNewFormationName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    try { localStorage.setItem("tennis-formations", JSON.stringify(formations)); }
    catch {}
  }, [formations]);

  const saveFormation = () => {
    const name = newFormationName.trim() || `Formation ${formations.length + 1}`;
    const formation = {
      id: Date.now(),
      name,
      players: players.map(({ id, name, side, x, y, color, reach, active }) => ({ id, name, side, x, y, color, reach, active })),
      ball: { ...ball },
    };
    setFormations(prev => [formation, ...prev]);
    setNewFormationName("");
  };

  const loadFormation = (formation) => {
    setPlayers(formation.players);
    setBall(formation.ball);
  };

  const deleteFormation = (id) => {
    setFormations(prev => prev.filter(f => f.id !== id));
    setConfirmDeleteId(null);
  };

  const activePlayer = players.find((p) => p.active) || players[0];

  const getMovementBounds = (player) => {
    if (player.side === "top") {
      return {
        minX: playArea.x - courtMargin,
        maxX: playArea.x + playArea.width + courtMargin,
        minY: playArea.y - courtMargin,
        maxY: netY,
      };
    }
    return {
      minX: playArea.x - courtMargin,
      maxX: playArea.x + playArea.width + courtMargin,
      minY: netY,
      maxY: playArea.y + playArea.height + courtMargin,
    };
  };

  const getSvgPoint = (event) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * svgWidth;
    const y = ((event.clientY - rect.top) / rect.height) * svgHeight;
    return { x, y };
  };

  const updatePlayerPosition = (id, point) => {
    if (!point) return;
    setPlayers((prev) =>
      prev.map((player) => {
        if (player.id !== id) return player;
        const bounds = getMovementBounds(player);
        return {
          ...player,
          x: clamp(point.x, bounds.minX, bounds.maxX),
          y: clamp(point.y, bounds.minY, bounds.maxY),
        };
      })
    );
  };

  const handlePointerDown = (id) => (event) => {
    event.preventDefault();
    setDraggingId(id);
  };

  const handlePointerMove = (event) => {
    if (draggingId === null) return;
    const point = getSvgPoint(event);
    if (!point) return;
    if (draggingId === 'ball') {
      setBall({
        x: clamp(point.x, playArea.x - courtMargin, playArea.x + playArea.width + courtMargin),
        y: clamp(point.y, playArea.y - courtMargin, playArea.y + playArea.height + courtMargin),
      });
    } else {
      updatePlayerPosition(draggingId, point);
    }
  };

  const handlePointerUp = () => setDraggingId(null);

  const courtCenterX = playArea.x + court.centerX;
  const halfCourtWidth = court.width / 2;
  const baseExtension = 0.6 * scale;
  const distanceToNetNorm = clamp01(Math.abs(activePlayer.y - netY) / court.netY);
  const netProximity = 1 - distanceToNetNorm;
  const activeLateralNorm = (activePlayer.x - courtCenterX) / halfCourtWidth;
  const activeSide = activeLateralNorm < 0 ? "left" : "right";

  // true when active player is on the top half — targets flip to bottom
  const isTopPlayer = activePlayer.side === "top";

  const playerOutsideLeft = Math.max(0, singlesLeftX - activePlayer.x);
  const playerOutsideRight = Math.max(0, activePlayer.x - singlesRightX);
  const outsideBoost = 1.0;
  const netApproachBoost = netProximity * 1.2 * scale;

  // Baseline and service corners — flipped for top players
  const targetBaselineY = isTopPlayer ? baselineBottomY + baseExtension : baselineTopY - baseExtension;
  const targetServiceY  = isTopPlayer ? bottomServiceY : topServiceY;

  // Net proximity widens the angle windows:
  // At baseline (netProximity=0) → normal court width
  // At net (netProximity=1) → windows push well beyond the sidelines (sharp volley angles)
  const netWidenAmount = netProximity * netProximity * 3.5 * scale; // eased, max ~87px at net

  // Down-the-line side stays pinned to the sideline — only cross-court side widens at net.
  // Player on left  → left anchor = down-the-line (no widen), right anchor = cross-court (widen)
  // Player on right → right anchor = down-the-line (no widen), left anchor = cross-court (widen)
  const leftWidenAmount  = activeSide === "left"  ? 0 : netWidenAmount;
  const rightWidenAmount = activeSide === "right" ? 0 : netWidenAmount;

  const singlesLeftBaselineCorner  = { x: singlesLeftX  - leftWidenAmount,  y: targetBaselineY };
  const singlesRightBaselineCorner = { x: singlesRightX + rightWidenAmount, y: targetBaselineY };
  const serviceLeftCorner   = { x: singlesLeftX  - leftWidenAmount,  y: targetServiceY };
  const serviceRightCorner  = { x: singlesRightX + rightWidenAmount, y: targetServiceY };
  const serviceCenterCorner = { x: centerServiceX,                   y: targetServiceY };

  const interpolate = (p1, p2, t) => ({
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  });

  const extendThroughPoint = (origin, through, extensionDistance) => {
    const dx = through.x - origin.x;
    const dy = through.y - origin.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    return {
      x: through.x + ux * extensionDistance,
      y: through.y + uy * extensionDistance,
    };
  };

  const extendToEdge = (origin, targetPoint) => {
    const dx = targetPoint.x - origin.x;
    const dy = targetPoint.y - origin.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const big = Math.max(svgWidth, svgHeight) * 2;
    return {
      x: origin.x + ux * big,
      y: origin.y + uy * big,
    };
  };

  const leftSinglesAnchor =
    activeSide === "left"
      ? interpolate(singlesLeftBaselineCorner, serviceLeftCorner, netProximity)
      : {
          x: singlesLeftX - leftWidenAmount - (playerOutsideRight * outsideBoost + netApproachBoost),
          y: targetBaselineY,
        };

  const rightSinglesAnchor =
    activeSide === "right"
      ? interpolate(singlesRightBaselineCorner, serviceRightCorner, netProximity)
      : {
          x: singlesRightX + rightWidenAmount + (playerOutsideLeft * outsideBoost + netApproachBoost),
          y: targetBaselineY,
        };

  const volleyCarryDistance = 1.8 * scale;

  const singlesLeftTarget =
    activeSide === "left"
      ? extendThroughPoint(activePlayer, leftSinglesAnchor, volleyCarryDistance)
      : leftSinglesAnchor;

  const singlesRightTarget =
    activeSide === "right"
      ? extendThroughPoint(activePlayer, rightSinglesAnchor, volleyCarryDistance)
      : rightSinglesAnchor;

  // Doubles windows — down-the-line side stays pinned, cross-court side widens
  const doublesLeftWindow  = { x: doublesLeftX  - leftWidenAmount,  y: targetBaselineY };
  const doublesRightWindow = { x: doublesRightX + rightWidenAmount, y: targetBaselineY };

  const target = {
    doublesLeftWindow,
    doublesRightWindow,
    singlesLeftWindow: singlesLeftTarget,
    singlesRightWindow: singlesRightTarget,
    serviceLeft: serviceLeftCorner,
    serviceCenter: serviceCenterCorner,
    serviceRight: serviceRightCorner,
  };

  const angles = {
    doublesLeftWindow: Math.atan2(target.doublesLeftWindow.y - activePlayer.y, target.doublesLeftWindow.x - activePlayer.x),
    doublesRightWindow: Math.atan2(target.doublesRightWindow.y - activePlayer.y, target.doublesRightWindow.x - activePlayer.x),
    singlesLeftWindow: Math.atan2(target.singlesLeftWindow.y - activePlayer.y, target.singlesLeftWindow.x - activePlayer.x),
    singlesRightWindow: Math.atan2(target.singlesRightWindow.y - activePlayer.y, target.singlesRightWindow.x - activePlayer.x),
    serviceLeft: Math.atan2(target.serviceLeft.y - activePlayer.y, target.serviceLeft.x - activePlayer.x),
    serviceCenter: Math.atan2(target.serviceCenter.y - activePlayer.y, target.serviceCenter.x - activePlayer.x),
    serviceRight: Math.atan2(target.serviceRight.y - activePlayer.y, target.serviceRight.x - activePlayer.x),
  };

  const openingBetween = (a, b) => {
    let diff = Math.abs(radToDeg(b - a));
    if (diff > 180) diff = 360 - diff;
    return diff;
  };

  const openings = {
    windowDoubles: openingBetween(angles.doublesLeftWindow, angles.doublesRightWindow),
    windowSingles: openingBetween(angles.singlesLeftWindow, angles.singlesRightWindow),
    serviceBoxLeft: openingBetween(angles.serviceLeft, angles.serviceCenter),
    serviceBoxRight: openingBetween(angles.serviceCenter, angles.serviceRight),
    serviceLineFull: openingBetween(angles.serviceLeft, angles.serviceRight),
  };

  const activePosition = {
    xMeters: ((activePlayer.x - playArea.x) / scale).toFixed(2),
    yMetersFromTop: ((activePlayer.y - playArea.y) / scale).toFixed(2),
  };

  const singlesLeftEnd = extendToEdge(activePlayer, target.singlesLeftWindow);
  const singlesRightEnd = extendToEdge(activePlayer, target.singlesRightWindow);
  const serviceLeftEnd = extendToEdge(activePlayer, target.serviceLeft);
  const serviceCenterEnd = extendToEdge(activePlayer, target.serviceCenter);
  const serviceRightEnd = extendToEdge(activePlayer, target.serviceRight);

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-4 sm:p-6 flex flex-col items-center gap-4 sm:gap-6">
      <div className="max-w-6xl w-full text-center px-2">
        <h1 className="text-xl sm:text-3xl font-bold text-slate-900">Tennis Court Angle Visualizer</h1>
        <p className="text-slate-600 mt-1 text-sm sm:text-base">Drag players to study the real shot window into the opposite court.</p>
      </div>

      <div className="w-full max-w-7xl grid lg:grid-cols-[1fr_380px] gap-4 sm:gap-6 items-start">
        <div className="bg-white rounded-3xl shadow-xl p-4 overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto rounded-2xl touch-none select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#dbe4ea" />
            <rect
              x={playArea.x - courtMargin}
              y={playArea.y - courtMargin}
              width={playArea.width + courtMargin * 2}
              height={playArea.height + courtMargin * 2}
              rx="16"
              fill="#7c9a6d"
            />
            <rect x={playArea.x} y={playArea.y} width={court.width} height={court.height} fill="#256c3a" rx="10" />
            <rect x={playArea.x} y={playArea.y} width={court.width} height={court.height} fill="none" stroke="white" strokeWidth="3" />
            <line x1={singlesLeftX} y1={playArea.y} x2={singlesLeftX} y2={playArea.y + court.height} stroke="white" strokeWidth="2.5" />
            <line x1={singlesRightX} y1={playArea.y} x2={singlesRightX} y2={playArea.y + court.height} stroke="white" strokeWidth="2.5" />
            <line x1={playArea.x} y1={netY} x2={playArea.x + court.width} y2={netY} stroke="#f8fafc" strokeWidth="5" />
            <line x1={singlesLeftX} y1={topServiceY} x2={singlesRightX} y2={topServiceY} stroke="white" strokeWidth="2.5" />
            <line x1={singlesLeftX} y1={bottomServiceY} x2={singlesRightX} y2={bottomServiceY} stroke="white" strokeWidth="2.5" />
            <line x1={centerServiceX} y1={topServiceY} x2={centerServiceX} y2={bottomServiceY} stroke="white" strokeWidth="2.5" />

            {showLayers.doubles && (
              <>
                <polygon
                  points={`${activePlayer.x},${activePlayer.y} ${target.doublesLeftWindow.x},${target.doublesLeftWindow.y} ${target.doublesRightWindow.x},${target.doublesRightWindow.y}`}
                  fill="#60a5fa"
                  opacity="0.08"
                />
                <line x1={activePlayer.x} y1={activePlayer.y} x2={target.doublesLeftWindow.x} y2={target.doublesLeftWindow.y} stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="7 5" />
                <line x1={activePlayer.x} y1={activePlayer.y} x2={target.doublesRightWindow.x} y2={target.doublesRightWindow.y} stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="7 5" />
              </>
            )}

            {showLayers.singles && (
              <>
                <polygon
                  points={`${activePlayer.x},${activePlayer.y} ${target.singlesLeftWindow.x},${target.singlesLeftWindow.y} ${target.singlesRightWindow.x},${target.singlesRightWindow.y}`}
                  fill="#f59e0b"
                  opacity="0.10"
                />
                <line x1={activePlayer.x} y1={activePlayer.y} x2={singlesLeftEnd.x} y2={singlesLeftEnd.y} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="7 5" />
                <line x1={activePlayer.x} y1={activePlayer.y} x2={singlesRightEnd.x} y2={singlesRightEnd.y} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="7 5" />
              </>
            )}

            {showLayers.service && (
              <>
                <polygon
                  points={`${activePlayer.x},${activePlayer.y} ${target.serviceLeft.x},${target.serviceLeft.y} ${target.serviceCenter.x},${target.serviceCenter.y}`}
                  fill="#a855f7"
                  opacity="0.10"
                />
                <polygon
                  points={`${activePlayer.x},${activePlayer.y} ${target.serviceCenter.x},${target.serviceCenter.y} ${target.serviceRight.x},${target.serviceRight.y}`}
                  fill="#22c55e"
                  opacity="0.10"
                />
                <line x1={activePlayer.x} y1={activePlayer.y} x2={serviceLeftEnd.x} y2={serviceLeftEnd.y} stroke="#a855f7" strokeWidth="2" strokeDasharray="7 5" />
                <line x1={activePlayer.x} y1={activePlayer.y} x2={serviceCenterEnd.x} y2={serviceCenterEnd.y} stroke="#22c55e" strokeWidth="2" strokeDasharray="7 5" />
                <line x1={activePlayer.x} y1={activePlayer.y} x2={serviceRightEnd.x} y2={serviceRightEnd.y} stroke="#a855f7" strokeWidth="2" strokeDasharray="7 5" />
              </>
            )}

            <circle cx={activePlayer.x} cy={activePlayer.y} r={activePlayer.reach} fill={activePlayer.color} opacity="0.10" stroke={activePlayer.color} strokeWidth="2" strokeDasharray="8 6" />

            {players.map((player) => (
              <g key={player.id}>
                <circle
                  cx={player.x}
                  cy={player.y}
                  r="13"
                  fill={player.color}
                  stroke={player.active ? "#f8fafc" : "white"}
                  strokeWidth={player.active ? "4" : "3"}
                  className="cursor-grab active:cursor-grabbing"
                />
                <text x={player.x} y={player.y - 20} textAnchor="middle" fontSize="13" fontWeight="700" fill="white" style={{pointerEvents:"none"}}>
                  {player.name}
                </text>
                {/* Larger invisible touch target */}
                <circle
                  cx={player.x}
                  cy={player.y}
                  r="28"
                  fill="transparent"
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={handlePointerDown(player.id)}
                />
              </g>
            ))}

            {/* Ball */}
            <circle
              cx={ball.x}
              cy={ball.y}
              r="9"
              fill="#ccff00"
              stroke="#888"
              strokeWidth="1.5"
            />
            <circle cx={ball.x} cy={ball.y} r="3" fill="#999" opacity="0.5" />
            {/* Larger invisible touch target for ball */}
            <circle
              cx={ball.x}
              cy={ball.y}
              r="26"
              fill="transparent"
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={handlePointerDown('ball')}
            />
          </svg>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-md p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Players</h2>

            {["bottom", "top"].map((side) => (
              <div key={side} className="mb-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{side} side</p>
                <div className="space-y-2">
                  {players.filter(p => p.side === side).map((player) => (
                    <div key={player.id} className="flex items-center gap-2">
                      <button
                        onClick={() => setPlayers((prev) => prev.map((p) => ({ ...p, active: p.id === player.id })))}
                        className={`w-10 h-10 rounded-xl border-2 flex-shrink-0 transition ${player.active ? "border-slate-900 shadow-md scale-110" : "border-transparent opacity-70"}`}
                        style={{ backgroundColor: player.color }}
                        title="Set active"
                      />
                      <input
                        type="text"
                        value={player.name}
                        onChange={(e) => setPlayers((prev) => prev.map((p) => p.id === player.id ? { ...p, name: e.target.value } : p))}
                        className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-base text-slate-800 focus:outline-none focus:border-slate-400"
                        maxLength={12}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-4 space-y-2">
              {Object.entries(showLayers).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setShowLayers((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`w-full rounded-lg px-3 py-3 text-sm border font-medium ${value ? "bg-green-600 text-white" : "bg-white text-slate-600"}`}
                >
                  {key.toUpperCase()} {value ? "ON" : "OFF"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4">
            <h2 className="font-semibold text-slate-900 mb-2">Shot window angles</h2>
            <div className="text-sm text-slate-700 space-y-2 leading-6">
              <p><span className="font-medium">Doubles target window:</span> {openings.windowDoubles.toFixed(1)}°</p>
              <p><span className="font-medium">Singles target window:</span> {openings.windowSingles.toFixed(1)}°</p>
              <p><span className="font-medium">Full service window:</span> {openings.serviceLineFull.toFixed(1)}°</p>
              <p><span className="font-medium">Ad service box:</span> {openings.serviceBoxLeft.toFixed(1)}°</p>
              <p><span className="font-medium">Deuce service box:</span> {openings.serviceBoxRight.toFixed(1)}°</p>
              <p><span className="font-medium">Player position:</span> x {activePosition.xMeters} m, y {activePosition.yMetersFromTop} m</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4">
            <h2 className="font-semibold text-slate-900 mb-2">Guide</h2>
            <div className="text-sm text-slate-600 leading-6 space-y-2">
              <p><span className="font-medium text-slate-800">Blue sector:</span> doubles shot window.</p>
              <p><span className="font-medium text-slate-800">Orange sector:</span> singles shot window. Near the net, the line aims toward the service-line/singles-line intersection and continues beyond it.</p>
              <p><span className="font-medium text-slate-800">Purple/green:</span> service boxes with official service margins.</p>
            </div>
          </div>

          {/* Formations */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Formations</h2>

            {/* Save current */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newFormationName}
                onChange={(e) => setNewFormationName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveFormation()}
                placeholder="Formation name…"
                className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-400"
                maxLength={24}
              />
              <button
                onClick={saveFormation}
                className="px-3 py-2 bg-slate-900 text-white text-sm rounded-lg font-medium hover:bg-slate-700 transition flex-shrink-0"
              >
                Save
              </button>
            </div>

            {/* Saved list */}
            {formations.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">No formations saved yet.</p>
            )}
            <div className="space-y-2">
              {formations.map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 hover:border-slate-300 transition">
                  <button
                    onClick={() => loadFormation(f)}
                    className="flex-1 text-left text-sm font-medium text-slate-800 truncate"
                  >
                    {f.name}
                  </button>
                  {confirmDeleteId === f.id ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => deleteFormation(f.id)} className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg">Delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(f.id)}
                      className="text-slate-300 hover:text-red-400 transition text-lg leading-none flex-shrink-0 px-1"
                      title="Delete"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useCallback } from 'react';
import { BaseEdge, EdgeProps, useReactFlow } from '@xyflow/react';

export default function DraggableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
  label,
}: EdgeProps) {
  const { setEdges, screenToFlowPosition } = useReactFlow();

  const waypoints = (data?.waypoints as { x: number, y: number }[]) || [];

  // Generate Polyline Path
  let path = '';
  let activeWaypoints = waypoints;

  // If they haven't explicitly added waypoints, render a default orthogonal step
  if (waypoints.length === 0) {
    const midX = sourceX + (targetX - sourceX) / 2;
    activeWaypoints = [
      { x: midX, y: sourceY },
      { x: midX, y: targetY }
    ];
  }

  path = `M ${sourceX} ${sourceY}`;
  activeWaypoints.forEach((wp) => {
    path += ` L ${wp.x} ${wp.y}`;
  });
  path += ` L ${targetX} ${targetY}`;

  const allPoints = [
    { x: sourceX, y: sourceY },
    ...activeWaypoints,
    { x: targetX, y: targetY }
  ];

  const updateWaypoint = useCallback(
    (index: number, position: { x: number, y: number }) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === id) {
            const currentWaypoints = e.data?.waypoints && (e.data.waypoints as any[]).length > 0 
                ? [...(e.data.waypoints as any[])] 
                : [...activeWaypoints];
            currentWaypoints[index] = position;
            return { ...e, data: { ...e.data, waypoints: currentWaypoints } };
          }
          return e;
        })
      );
    },
    [id, setEdges, activeWaypoints]
  );

  const insertWaypoint = useCallback(
    (index: number, position: { x: number, y: number }) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === id) {
            const currentWaypoints = e.data?.waypoints && (e.data.waypoints as any[]).length > 0 
                ? [...(e.data.waypoints as any[])] 
                : [...activeWaypoints];
            currentWaypoints.splice(index, 0, position);
            return { ...e, data: { ...e.data, waypoints: currentWaypoints } };
          }
          return e;
        })
      );
    },
    [id, setEdges, activeWaypoints]
  );

  const removeWaypoint = useCallback(
    (index: number) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === id) {
            const currentWaypoints = e.data?.waypoints && (e.data.waypoints as any[]).length > 0 
                ? [...(e.data.waypoints as any[])] 
                : [...activeWaypoints];
            currentWaypoints.splice(index, 1);
            return { ...e, data: { ...e.data, waypoints: currentWaypoints } };
          }
          return e;
        })
      );
    },
    [id, setEdges, activeWaypoints]
  );

  const handlePointerDownWaypoint = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);

    if (e.button === 2) { // Right click removes
      removeWaypoint(index);
      target.releasePointerCapture(e.pointerId);
      return;
    }

    target.onpointermove = (moveEvent) => {
      const position = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      updateWaypoint(index, position);
    };

    target.onpointerup = () => {
      target.onpointermove = null;
      target.onpointerup = null;
      target.releasePointerCapture(e.pointerId);
    };
  };

  const midpoints = [];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];
    midpoints.push({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
      insertIndex: i
    });
  }

  // Label positioning logic
  const customLabelPos = data?.labelPos as { x: number, y: number } | undefined;
  let labelX = 0;
  let labelY = 0;

  if (customLabelPos) {
    labelX = customLabelPos.x;
    labelY = customLabelPos.y;
  } else if (label) {
    let totalLength = 0;
    const lengths = [];
    for (let i = 0; i < allPoints.length - 1; i++) {
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1];
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      lengths.push(len);
      totalLength += len;
    }
    const targetLen = totalLength / 2;
    let currentLen = 0;
    for (let i = 0; i < lengths.length; i++) {
      if (currentLen + lengths[i] >= targetLen) {
        const remaining = targetLen - currentLen;
        const ratio = lengths[i] > 0 ? remaining / lengths[i] : 0.5;
        const p1 = allPoints[i];
        const p2 = allPoints[i + 1];
        labelX = p1.x + (p2.x - p1.x) * ratio;
        labelY = p1.y + (p2.y - p1.y) * ratio;
        break;
      }
      currentLen += lengths[i];
    }
  }

  const updateLabelPos = useCallback(
    (position: { x: number, y: number }) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === id) {
            return { ...e, data: { ...e.data, labelPos: position } };
          }
          return e;
        })
      );
    },
    [id, setEdges]
  );

  const handlePointerDownLabel = (e: React.PointerEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);

    target.onpointermove = (moveEvent) => {
      const position = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      updateLabelPos(position);
    };

    target.onpointerup = () => {
      target.onpointermove = null;
      target.onpointerup = null;
      target.releasePointerCapture(e.pointerId);
    };
  };

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          className="nodrag nopan"
          onPointerDown={handlePointerDownLabel as any}
          style={{
            fill: '#94A3B8',
            fontSize: '10px',
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            pointerEvents: 'all',
            cursor: 'grab',
            userSelect: 'none',
            paintOrder: 'stroke',
            stroke: '#070B19',
            strokeWidth: '4px',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }}
        >
          {label}
        </text>
      )}
      
      <g className="edge-interaction-group">
        {/* Draw midpoints to add NEW segments */}
        {midpoints.map((mp, idx) => (
          <circle
            key={`mid-${idx}`}
            cx={mp.x}
            cy={mp.y}
            r={6}
            fill="#6366F1"
            stroke="#070B19"
            strokeWidth={2}
            className="edge-create-handle"
            style={{ cursor: 'copy', pointerEvents: 'all', opacity: 0.7 }}
            onPointerDown={(e) => {
              e.stopPropagation();
              const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
              insertWaypoint(mp.insertIndex, position);
            }}
          />
        ))}

        {/* Draw actual waypoints (existing corners) */}
        {activeWaypoints.map((wp, index) => (
          <circle
            key={`wp-${index}`}
            cx={wp.x}
            cy={wp.y}
            r={8}
            fill="#00D2FF"
            stroke="#070B19"
            strokeWidth={2}
            className="edge-grab-handle"
            style={{ cursor: 'grab', pointerEvents: 'all' }}
            onPointerDown={(e) => handlePointerDownWaypoint(e, index)}
            onContextMenu={(e) => e.preventDefault()}
          />
        ))}
      </g>
    </>
  );
}

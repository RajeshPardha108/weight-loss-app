"use client";

import React from "react";

export default function BodyVisualizer({ measurements }: { measurements: any[] }) {
  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;

  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.03)', 
      border: '1px solid rgba(255, 255, 255, 0.05)', 
      borderRadius: '1.25rem', 
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#f8fafc', alignSelf: 'flex-start' }}>Body Silhouette</h3>
      
      <div style={{ position: 'relative', width: '312px', height: '500px' }}>
        <svg width="100%" height="100%" viewBox="-15 5 130 160" preserveAspectRatio="xMidYMid meet">
          {/* Premium Realistic Body Visual */}
          <image 
            href="/body-silhouette.jpg" 
            x="-10" 
            y="-10" 
            width="120" 
            height="210" 
            preserveAspectRatio="xMidYMid meet"
            style={{ mixBlendMode: 'lighten', opacity: 0.95 }}
          />
          
          {/* Markers */}
          {/* Neck */}
          <circle cx="50" cy="36" r="2.5" fill="#818cf8" />
          <line x1="50" y1="36" x2="80" y2="36" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="82" y="37.5" fontSize="5" fill="#94a3b8">Neck {latest?.neck_cm ? <tspan fill="#f8fafc" fontWeight="bold">{latest.neck_cm}cm</tspan> : ''}</text>

          {/* Chest */}
          <circle cx="50" cy="55" r="2.5" fill="#818cf8" />
          <line x1="50" y1="55" x2="28" y2="55" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="26" y="56.5" fontSize="5" fill="#94a3b8" textAnchor="end">Chest {latest?.chest_cm ? <tspan fill="#f8fafc" fontWeight="bold">{latest.chest_cm}cm</tspan> : ''}</text>

          {/* Waist */}
          <circle cx="50" cy="70" r="2.5" fill="#818cf8" />
          <line x1="50" y1="70" x2="80" y2="70" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="82" y="71.5" fontSize="5" fill="#94a3b8">Waist {latest?.waist_cm ? <tspan fill="#f8fafc" fontWeight="bold">{latest.waist_cm}cm</tspan> : ''}</text>

          {/* Abdomen */}
          <circle cx="50" cy="80" r="2.5" fill="#818cf8" />
          <line x1="50" y1="80" x2="28" y2="80" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="26" y="81.5" fontSize="5" fill="#94a3b8" textAnchor="end">Abdomen {latest?.abdomen_cm ? <tspan fill="#f8fafc" fontWeight="bold">{latest.abdomen_cm}cm</tspan> : ''}</text>

          {/* Hip */}
          <circle cx="50" cy="90" r="2.5" fill="#818cf8" />
          <line x1="50" y1="90" x2="80" y2="90" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="82" y="91.5" fontSize="5" fill="#94a3b8">Hip {latest?.hip_cm ? <tspan fill="#f8fafc" fontWeight="bold">{latest.hip_cm}cm</tspan> : ''}</text>

          {/* Thigh */}
          <circle cx="42" cy="115" r="2.5" fill="#818cf8" />
          <line x1="42" y1="115" x2="28" y2="115" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="26" y="116.5" fontSize="5" fill="#94a3b8" textAnchor="end">Thigh {latest?.thigh_cm ? <tspan fill="#f8fafc" fontWeight="bold">{latest.thigh_cm}cm</tspan> : ''}</text>

          {/* Upper Arm */}
          <circle cx="32" cy="65" r="2.5" fill="#818cf8" />
          <line x1="32" y1="65" x2="18" y2="65" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="16" y="66.5" fontSize="5" fill="#94a3b8" textAnchor="end">Arm {latest?.upper_arm_cm ? <tspan fill="#f8fafc" fontWeight="bold">{latest.upper_arm_cm}cm</tspan> : ''}</text>
        </svg>
      </div>
    </div>
  );
}

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
      
      <div style={{ position: 'relative', width: '250px', height: '400px' }}>
        <svg width="100%" height="100%" viewBox="-30 0 160 200" preserveAspectRatio="xMidYMid meet">
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
          <circle cx="50" cy="36" r="3" fill="#818cf8" />
          <line x1="50" y1="36" x2="80" y2="36" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="82" y="38" fontSize="5" fill="#94a3b8">Neck {latest?.neck_cm ? `${latest.neck_cm}cm` : ''}</text>

          {/* Chest */}
          <circle cx="50" cy="55" r="3" fill="#818cf8" />
          <line x1="50" y1="55" x2="20" y2="55" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="18" y="57" fontSize="5" fill="#94a3b8" textAnchor="end">Chest {latest?.chest_cm ? `${latest.chest_cm}cm` : ''}</text>

          {/* Waist */}
          <circle cx="50" cy="70" r="3" fill="#818cf8" />
          <line x1="50" y1="70" x2="80" y2="70" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="82" y="72" fontSize="5" fill="#94a3b8">Waist {latest?.waist_cm ? `${latest.waist_cm}cm` : ''}</text>

          {/* Abdomen */}
          <circle cx="50" cy="80" r="3" fill="#818cf8" />
          <line x1="50" y1="80" x2="20" y2="80" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="18" y="82" fontSize="5" fill="#94a3b8" textAnchor="end">Abdomen {latest?.abdomen_cm ? `${latest.abdomen_cm}cm` : ''}</text>

          {/* Hip */}
          <circle cx="50" cy="90" r="3" fill="#818cf8" />
          <line x1="50" y1="90" x2="80" y2="90" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="82" y="92" fontSize="5" fill="#94a3b8">Hip {latest?.hip_cm ? `${latest.hip_cm}cm` : ''}</text>

          {/* Thigh */}
          <circle cx="42" cy="115" r="3" fill="#818cf8" />
          <line x1="42" y1="115" x2="20" y2="115" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="18" y="117" fontSize="5" fill="#94a3b8" textAnchor="end">Thigh {latest?.thigh_cm ? `${latest.thigh_cm}cm` : ''}</text>

          {/* Upper Arm */}
          <circle cx="32" cy="65" r="3" fill="#818cf8" />
          <line x1="32" y1="65" x2="10" y2="65" stroke="rgba(255,255,255,0.2)" strokeDasharray="2" />
          <text x="8" y="67" fontSize="5" fill="#94a3b8" textAnchor="end">Arm {latest?.upper_arm_cm ? `${latest.upper_arm_cm}cm` : ''}</text>
        </svg>
      </div>
    </div>
  );
}

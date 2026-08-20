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
          {/* Simple abstracted human silhouette */}
          <path 
            d="M50 15 C55 15, 59 19, 59 24 C59 29, 55 33, 50 33 C45 33, 41 29, 41 24 C41 19, 45 15, 50 15 Z" 
            fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1"
          />
          {/* Neck */}
          <path d="M47 33 L53 33 L54 40 L46 40 Z" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1"/>
          {/* Torso */}
          <path d="M35 45 C40 40, 60 40, 65 45 L62 90 C62 95, 38 95, 38 90 Z" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1"/>
          {/* Arms */}
          <path d="M35 45 C30 50, 25 70, 27 90" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round"/>
          <path d="M65 45 C70 50, 75 70, 73 90" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round"/>
          {/* Legs */}
          <path d="M40 92 C38 120, 42 180, 42 180" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round"/>
          <path d="M60 92 C62 120, 58 180, 58 180" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round"/>
          
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

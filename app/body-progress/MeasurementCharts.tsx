"use client";

import React, { useState } from "react";
import styles from "./page.module.css";

function MeasurementChart({ title, dataKey, measurements }: { title: string, dataKey: string, measurements: any[] }) {
  // Filter measurements that actually have this data point
  const validData = measurements.filter(m => m[dataKey] !== null).map(m => ({
    date: m.measurement_date,
    val: Number(m[dataKey])
  }));

  if (validData.length < 2) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)', 
        border: '1px solid rgba(255, 255, 255, 0.05)', 
        borderRadius: '1.25rem', 
        padding: '2rem',
        textAlign: 'center',
        color: '#94a3b8'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📏</div>
        Not enough data to show a trend for {title}.
      </div>
    );
  }

  const starting = validData[0].val;
  const latest = validData[validData.length - 1].val;
  const change = latest - starting;
  const changeStr = change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);

  const minVal = Math.floor(Math.min(...validData.map(d => d.val))) - 1;
  const maxVal = Math.ceil(Math.max(...validData.map(d => d.val))) + 1;
  const range = maxVal - minVal;

  const getY = (v: number) => 100 - (((v - minVal) / range) * 100);

  const points = validData.map((d, i) => {
    const x = (i / (validData.length - 1)) * 100;
    const y = getY(d.val);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)', 
      border: '1px solid rgba(255, 255, 255, 0.05)', 
      borderRadius: '1.25rem', 
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{validData.length} records</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.25rem', color: '#38bdf8', fontWeight: 700 }}>{latest.toFixed(1)} cm</div>
          <div style={{ fontSize: '0.75rem', color: change > 0 ? '#f87171' : (change < 0 ? '#4ade80' : '#94a3b8') }}>
            {changeStr} cm total
          </div>
        </div>
      </div>
      
      <div style={{ height: '80px', width: '100%', position: 'relative', marginTop: '0.5rem' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <polyline
            fill="none"
            stroke="#818cf8"
            strokeWidth="3"
            points={points}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: '#64748b' }}>
        <span>{new Date(validData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(validData[validData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

export default function MeasurementCharts({ measurements }: { measurements: any[] }) {
  const [activeTab, setActiveTab] = useState("waist_cm");
  
  if (!measurements || measurements.length === 0) return null;

  const tabs = [
    { id: "waist_cm", label: "Waist" },
    { id: "abdomen_cm", label: "Abdomen" },
    { id: "hip_cm", label: "Hip" },
    { id: "chest_cm", label: "Chest" },
    { id: "thigh_cm", label: "Thigh" },
    { id: "upper_arm_cm", label: "Upper Arm" },
    { id: "neck_cm", label: "Neck" }
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>Measurement</label>
        <div style={{ position: 'relative', flex: 1 }}>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            style={{
              width: '100%',
              appearance: 'none',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.75rem',
              color: '#f8fafc',
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {tabs.map(tab => (
              <option key={tab.id} value={tab.id} style={{ background: '#1e293b', color: '#f8fafc' }}>
                {tab.label}
              </option>
            ))}
          </select>
          <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }}>
            ▼
          </div>
        </div>
      </div>
      <MeasurementChart title={currentTab.label} dataKey={currentTab.id} measurements={measurements} />
    </div>
  );
}

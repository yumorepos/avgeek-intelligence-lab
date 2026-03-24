"use client";

import { EnhancedLineChart } from "@/components/EnhancedLineChart";
import { EnhancedRouteCard } from "@/components/EnhancedRouteCard";

export default function TestUIPage() {
  // Test data
  const fareData = [
    { label: "Jan", value: 350 },
    { label: "Feb", value: 320 },
    { label: "Mar", value: 380 },
    { label: "Apr", value: 340 },
    { label: "May", value: 310 },
  ];

  const testRoute = {
    destination: {
      iata: "LAX",
      city: "Los Angeles",
      name: "Los Angeles International",
    },
    score: 78,
    deal_signal: "strong_deal",
    latest_fare: 310,
    reliability_score: 85,
    confidence: "high",
  };

  const testOrigin = { iata: "JFK" };

  return (
    <div className="page-shell">
      <div className="hero">
        <p className="eyebrow">UI Component Test</p>
        <h1 className="text-4xl font-bold mb-4">Enhanced Components Showcase</h1>
        <p className="text-lg text-gray-600">
          Testing Recharts + Tailwind CSS integration
        </p>
      </div>

      <div className="panel">
        <p className="badge badge-warning">Developer surface only · not a core product module</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <EnhancedLineChart
          title="Fare Trend (Last 5 Months)"
          points={fareData}
          color="#3b82f6"
          valueFormatter={(v) => `$${v.toFixed(0)}`}
          showTrend={true}
        />

        <EnhancedLineChart
          title="Reliability Trend"
          points={[
            { label: "Jan", value: 82 },
            { label: "Feb", value: 88 },
            { label: "Mar", value: 85 },
            { label: "Apr", value: 90 },
            { label: "May", value: 87 },
          ]}
          color="#22c55e"
          valueFormatter={(v) => `${v.toFixed(0)}%`}
          showTrend={true}
        />
      </div>

      <div className="panel">
        <h2 className="text-2xl font-bold mb-6">Route Cards</h2>
        <div className="route-grid">
          <EnhancedRouteCard origin={testOrigin} route={testRoute} />
          <EnhancedRouteCard
            origin={testOrigin}
            route={{
              ...testRoute,
              destination: { iata: "SFO", city: "San Francisco", name: "SFO" },
              score: 65,
              deal_signal: "deal",
              latest_fare: 280,
              reliability_score: 78,
              confidence: "medium",
            }}
          />
          <EnhancedRouteCard
            origin={testOrigin}
            route={{
              ...testRoute,
              destination: { iata: "ORD", city: "Chicago", name: "O'Hare" },
              score: 45,
              deal_signal: "expensive",
              latest_fare: 420,
              reliability_score: 65,
              confidence: "low",
            }}
          />
        </div>
      </div>

      <div className="panel">
        <h2 className="text-2xl font-bold mb-4">Utility Classes Test</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <span className="badge badge-success">Success Badge</span>
            <span className="badge badge-warning">Warning Badge</span>
            <span className="badge badge-danger">Danger Badge</span>
            <span className="badge badge-neutral">Neutral Badge</span>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary">Primary Button</button>
            <button className="btn btn-secondary">Secondary Button</button>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-2">Card Component</h3>
            <p className="muted">
              This is a test card with hover effect. Hover to see shadow
              enhancement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

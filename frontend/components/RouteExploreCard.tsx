import Link from "next/link";
import { RouteExploreCard as RouteExploreCardType } from "@/lib/api";
import { formatLocation, formatPercent } from "@/lib/format";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";

type Props = {
  origin: string;
  route: RouteExploreCardType;
};

export function RouteExploreCard({ origin, route }: Props) {
  const scoreText = route.latest_route_attractiveness_score !== null 
    ? route.latest_route_attractiveness_score.toFixed(1) 
    : "N/A";
  
  const scoreNum = route.latest_route_attractiveness_score ?? 0;
  const dealClass = route.latest_deal_signal ? `deal-${route.latest_deal_signal}` : "";

  // Determine deal icon
  const DealIcon = route.latest_deal_signal === 'strong_deal' || route.latest_deal_signal === 'deal' 
    ? TrendingDown 
    : route.latest_deal_signal === 'expensive' 
    ? TrendingUp 
    : AlertCircle;

  return (
    <article className="route-card fade-in">
      <div className="route-card-top">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900">{route.destination.iata}</h3>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">{route.destination.city ?? "Unknown city"}</p>
          <p className="text-xs text-gray-500">{formatLocation(route.destination.city, route.destination.state, route.destination.country)}</p>
        </div>
        <div className="score-pill flex items-center gap-2">
          {scoreNum >= 80 && <CheckCircle className="w-4 h-4" />}
          <span>Score {scoreText}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 my-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <dt className="text-sm font-medium text-gray-600">Deal Signal</dt>
          <dd className={`deal-pill ${dealClass} flex items-center gap-1`}>
            <DealIcon className="w-3 h-3" />
            {route.latest_deal_signal ?? "N/A"}
          </dd>
        </div>
        
        {route.headline_fare_insight && (
          <div className="col-span-full">
            <dt className="text-sm font-medium text-gray-600 mb-1">Fare Insight</dt>
            <dd className="text-sm text-gray-900 font-medium">{route.headline_fare_insight}</dd>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <dt className="text-gray-500 mb-1">On-Time Rate</dt>
          <dd className="text-gray-900 font-bold text-sm">{formatPercent(route.reliability_summary.avg_ontime_rate)}</dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Cancellation Rate</dt>
          <dd className="text-gray-900 font-bold text-sm">{formatPercent(route.reliability_summary.avg_cancellation_rate)}</dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Confidence</dt>
          <dd className="text-gray-900 font-bold text-sm">{route.score_confidence ?? "unknown"}</dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Score</dt>
          <dd className="text-gray-900 font-bold text-sm">{scoreText}/100</dd>
        </div>
      </dl>

      <p className="card-footnote">
        Higher scores indicate stronger historical attractiveness. Not a guarantee of future prices.
      </p>

      <Link href={`/routes/${origin}/${route.destination.iata}`} className="details-link">
        View Full Analysis
        <ArrowRight className="w-4 h-4" />
      </Link>
    </article>
  );
}

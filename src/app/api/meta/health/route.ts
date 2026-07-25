import { NextRequest, NextResponse } from 'next/server';
import { getObservabilityHealth } from '@/lib/meta-observability';

/**
 * GET /api/meta/health
 *
 * Production Health Check & Performance Observability Endpoint.
 * Returns system health, component statuses, latency metrics, and success/failure statistics.
 */
export async function GET(req: NextRequest) {
  try {
    const health = await getObservabilityHealth();
    
    const statusCode = health.status === 'healthy' ? 200 : 200;

    return NextResponse.json(
      {
        status: health.status,
        timestamp: health.timestamp,
        webhook: health.webhook_status,
        graph_api: health.graph_api_status,
        database: health.database_status,
        page_mapping: health.page_mapping_status,
        oauth: health.oauth_status,
        retry_queue: {
          pending_count: health.metrics.pending_retries_count,
        },
        connected_resources: {
          pages_count: health.metrics.connected_pages_count,
          forms_count: health.metrics.connected_forms_count,
        },
        performance_metrics: {
          success_rate_percent: `${health.metrics.success_rate_percent}%`,
          error_rate_percent: `${health.metrics.error_rate_percent}%`,
          average_processing_time_ms: `${health.metrics.average_processing_time_ms}ms`,
        },
        last_successful_lead: health.last_successful_lead,
        last_failed_lead: health.last_failed_lead,
      },
      {
        status: statusCode,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

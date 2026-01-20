import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  
  const checks = {
    database: false,
    databaseLatency: 0,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('count').limit(1).single();
    checks.databaseLatency = Date.now() - dbStart;
    checks.database = !error;

    const totalLatency = Date.now() - startTime;
    const isHealthy = checks.database && checks.databaseLatency < 1000;

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      checks,
      latency: totalLatency,
    }, { 
      status: isHealthy ? 200 : 503 
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      checks,
      error: 'Health check failed',
      latency: Date.now() - startTime,
    }, { status: 503 });
  }
}

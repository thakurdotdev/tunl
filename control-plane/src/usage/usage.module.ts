import { Module } from '@nestjs/common';

// Phase 3: usage aggregation/dashboards. Ingestion already happens via
// InternalController's POST /internal/usage (log-only for now) — this
// module is where aggregation/billing hookup will live (plan section 2.5).
@Module({})
export class UsageModule {}

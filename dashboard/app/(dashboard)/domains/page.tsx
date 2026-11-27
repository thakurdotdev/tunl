"use client";

import CustomDomainsCard from "@/components/custom-domains-card";
import { PageHeader } from "@/components/portal/page-header";

export default function CustomDomainsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Custom domains" description="Serve a tunnel from a hostname you own." />
      <CustomDomainsCard />
    </div>
  );
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy, CheckCircle } from "lucide-react"
import { DnsRecordRow } from "@/components/pages/records/dns-record-row"
import { useRouter } from "next/navigation"
import { getDnsRecord, type DnsRecord } from "@/lib/dns"
import { SkeletonRow } from "@/components/pages/records/row-skeleton"
import { NoRecordsFound } from "@/components/pages/records/no-records-found"
import { ClientError } from "@/components/client-error"
import { usePkarr } from "@/providers/pkarr-provider"
import { RESOLVE_POLICY_LABELS, type ResolvePolicyName } from "@/lib/resolve-policy"
import { saveRecentKey } from "@/lib/utils"

// Constants
const SKELETON_ROWS = 8
const COPY_TIMEOUT = 2000
const IBM_PLEX_MONO_FONT = "'IBM Plex Mono', 'Courier New', monospace"

// Pkarr packet type
type PkarrPacket = {
  records: DnsRecord[] | null
  lastUpdated: string | null
  compressedSize: number | null
  resolvePolicy: ResolvePolicyName | null
}

export function PkResolver({ publicKey }: { publicKey: string }) {
    
    const router = useRouter()

    // Global pkarr client state
    const { resolve, settings, isLoading: clientLoading, error: clientError, retry } = usePkarr()

    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [resolutionError, setResolutionError] = useState<string | null>(null)
    const [refreshCount, setRefreshCount] = useState(0)
    const [pkarrPacket, setPkarrPacket] = useState<PkarrPacket>({
        records: null,
        lastUpdated: null,
        compressedSize: null,
        resolvePolicy: null
    })

    useEffect(() => {
        let cancelled = false;

        const fetchKeyData = async () => {
            if (!publicKey || clientLoading || clientError) return;

            try {
                setLoading(true);
                setResolutionError(null);
                const resolvePolicy = settings.resolvePolicy;
                const resolvedPacket = await resolve(publicKey);

                if (!resolvedPacket) {
                    if (cancelled) return;
                    console.log("No packet found for key:", publicKey);
                    setPkarrPacket({ records: null, lastUpdated: null, compressedSize: null, resolvePolicy: null });
                    return;
                }

                try {
                    if (cancelled) return;

                    // Save the key in local storage
                    saveRecentKey(publicKey)
                    setPkarrPacket({
                        records: resolvedPacket.records.map(getDnsRecord),
                        lastUpdated: new Date(resolvedPacket.timestampMs / 1000).toISOString(),
                        compressedSize: resolvedPacket.compressedBytes().length,
                        resolvePolicy
                    });
                } finally {
                    resolvedPacket.free();
                }
            } catch (err) {
                if (cancelled) return;
                console.error("Error fetching key data:", err);
                setResolutionError(err instanceof Error ? err.message : "Failed to resolve this public key");
                setPkarrPacket({ records: null, lastUpdated: null, compressedSize: null, resolvePolicy: null });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchKeyData();

        return () => {
            cancelled = true;
        };
    }, [publicKey, resolve, settings.resolvePolicy, clientLoading, clientError, refreshCount])

    const retryResolution = () => {
        if (clientError) {
            retry()
        } else {
            setRefreshCount((count) => count + 1)
        }
    }

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            setCopied(true)
            setTimeout(() => setCopied(false), COPY_TIMEOUT)
        } catch (err) {
            console.error("Failed to copy:", err)
        }
    }

    const handleBackToSearch = () => {
        router.push('/')
    }
    return (
        <main className="container mx-auto px-8 py-12 max-w-6xl">
            {/* Header with Back Button and Results */}
            <div className="mb-8">
                <div className="flex items-center space-x-4 mb-8">
                    <button onClick={handleBackToSearch} className="inline-flex items-center text-gray-600 hover:text-purple-500">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-medium text-gray-400">Results for</h1>
                </div>
                <div className="flex items-center justify-between mb-6">
                    <div className="text-3xl font-bold text-white break-all font-mono" style={{ fontFamily: IBM_PLEX_MONO_FONT }}>{publicKey}</div>
                    <Button
                        onClick={copyToClipboard}
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                    >
                        {copied ? (
                            <CheckCircle className="w-4 h-4 text-[rgb(91,64,234)]" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* DNS Records Table, No Records Message, or Client Error */}
            {(clientError || resolutionError) ? (
                <ClientError error={clientError || resolutionError || "Unknown error"} onRetry={retryResolution} />
            ) : (clientLoading || loading) || pkarrPacket.records ? (
                <div className="mb-6">
                    <div className="rounded-lg overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-6 px-6 py-2">
                            <div className="col-span-3 text-sm font-semibold text-white uppercase tracking-wider">NAME</div>
                            <div className="col-span-2 text-sm font-semibold text-white uppercase tracking-wider text-center">TYPE</div>
                            <div className="col-span-6 text-sm font-semibold text-white uppercase tracking-wider">VALUE</div>
                            <div className="col-span-1 text-sm font-semibold text-white uppercase tracking-wider">TTL</div>
                        </div>

                        {/* Table Rows */}
                        <div className="max-h-[46vh] overflow-y-auto scrollbar-purple">
                            {(clientLoading || loading) ? (
                                Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                                    <SkeletonRow key={index} index={index} />
                                ))
                            ) : (
                                pkarrPacket.records?.map((record: DnsRecord, index: number) => (
                                    <DnsRecordRow
                                        key={index}
                                        dnsRecord={record}
                                        index={index}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <NoRecordsFound />
            )}

            {/* Key Info - Below table with margin */}
            {pkarrPacket.records && (
                <div className="mt-10 pt-6 border-t border-gray-700/30">
                    <div className="flex flex-wrap justify-end gap-8 text-sm">
                        <div className="flex flex-col">
                            <div className="text-gray-400 mb-1 text-xs uppercase tracking-wider">Resolve Policy</div>
                            <div>
                                {pkarrPacket.resolvePolicy ? (
                                    <span className="text-sm font-normal text-gray-400">
                                        {RESOLVE_POLICY_LABELS[pkarrPacket.resolvePolicy]}
                                    </span>
                                ) : 'Unknown'}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="text-gray-400 mb-1 text-xs uppercase tracking-wider">Last Updated</div>
                            <div className="text-white font-medium">
                                {pkarrPacket.lastUpdated ? new Date(pkarrPacket.lastUpdated).toLocaleString() : 'Unknown'}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="text-gray-400 mb-1 text-xs uppercase tracking-wider">Compressed Size</div>
                            <div className="text-white font-medium">
                                {pkarrPacket.compressedSize ? (
                                    <>
                                        <span className="font-bold">{pkarrPacket.compressedSize}</span><span className="text-gray-500">/1000</span> bytes
                                    </>
                                ) : 'Unknown'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

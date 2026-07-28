import { Fingerprint, Github } from "lucide-react"
import Link from "next/link"
import { PkarrSettingsDialog } from "@/components/pkarr-settings-dialog"

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full border-1 border-foreground flex items-center justify-center">
            <Fingerprint className="w-5 h-5" />
          </div>
          <span className="font-medium">PKDNS DIG</span>
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <PkarrSettingsDialog />
        <Link
          href="https://github.com/pubky/pkdns-digger"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 text-sm hover:text-purple-500"
        >
          <Github className="w-4 h-4" />
          <span>Edit on GitHub</span>
        </Link>
      </div>
    </header>
  )
}

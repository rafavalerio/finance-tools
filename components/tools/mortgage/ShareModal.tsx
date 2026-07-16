'use client'

import { Button, Modal, CheckIcon, CopyIcon } from '@/components/ui'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  shareUrl: string
  copied: boolean
  onCopy: () => void
}

export function ShareModal({ isOpen, onClose, shareUrl, copied, onCopy }: ShareModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Calculator">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Share this link to let others see your mortgage calculation with all the details
          pre-filled.
        </p>

        {/* URL Display */}
        <div className="relative">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className={`
              w-full px-4 py-3 pr-24 bg-background border border-border rounded-lg
              text-sm text-foreground font-mono truncate
            `}
          />
          <Button
            variant={copied ? 'primary' : 'secondary'}
            size="sm"
            onClick={onCopy}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            {copied ? (
              <>
                <CheckIcon width="14" height="14" className="mr-1" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon width="14" height="14" className="mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <p className="text-xs text-muted">
          The link contains all your inputs encoded. No data is stored on any server.
        </p>
      </div>
    </Modal>
  )
}

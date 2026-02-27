"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { PropsWithChildren, ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  footer?: ReactNode;
}

export function Modal({ open, onOpenChange, title, children, footer }: PropsWithChildren<ModalProps>) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-surface p-5 shadow-card">
          <Dialog.Title className="text-center text-[20px] font-semibold text-textPrimary">{title}</Dialog.Title>
          <div className="mt-4 space-y-3">{children}</div>
          {footer ? <div className="mt-5">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

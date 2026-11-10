import * as React from "react";
import Image from "next/image";
import type { CoinSymbol } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface CoinIconProps {
  symbol: CoinSymbol;
  size?: number;
  className?: string;
}

const COIN_NAMES: Record<CoinSymbol, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  SUI: "Sui",
  BNB: "BNB",
  XRP: "XRP",
};

/**
 * Coin logos from CoinMarketCap (https://coinmarketcap.com/), stored locally in
 * /public/coins/{SYMBOL}.png (128x128) so rendering never depends on a remote host.
 */
export function CoinIcon({ symbol, size = 36, className }: CoinIconProps) {
  return (
    <Image
      src={`/coins/${symbol}.png`}
      alt={COIN_NAMES[symbol]}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}

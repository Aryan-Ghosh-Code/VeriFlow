// =============================================================================
// VeriFlow Protocol – Listing Grid
// =============================================================================

"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { ListingCard } from "./ListingCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Listing } from "@/types/rental";

interface ListingGridProps {
  listings: Listing[];
  trustScore: number;
  isLoading?: boolean;
}

const containerVars: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVars: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function ListingGrid({ listings, trustScore, isLoading = false }: ListingGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner label="Loading listings…" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <motion.p 
          initial={{ rotate: -10 }}
          animate={{ rotate: 10 }}
          transition={{ repeat: Infinity, repeatType: "reverse", duration: 2 }}
          className="text-5xl mb-4"
        >📭</motion.p>
        <h3 className="text-lg font-semibold text-white/70">No listings yet</h3>
        <p className="text-sm text-white/30 mt-1">
          Be the first to create a rental listing.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={containerVars}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
    >
      {listings.map((listing) => (
        <motion.div key={listing.id} variants={itemVars} className="h-full">
          <ListingCard listing={listing} trustScore={trustScore} />
        </motion.div>
      ))}
    </motion.div>
  );
}

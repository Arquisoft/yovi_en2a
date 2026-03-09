import type { RankingElementLocal } from "../rankingElements/RankingElementLocal";
import React from 'react';

export interface RankingTypeLocal {
  id: string;
  label: string;
  elements: RankingElementLocal[];
  render(): React.ReactNode;
}
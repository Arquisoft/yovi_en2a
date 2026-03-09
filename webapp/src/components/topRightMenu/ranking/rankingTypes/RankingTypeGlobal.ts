import type { RankingElementGlobal } from "../rankingElements/RankingElementGlobal";
import React from 'react';

export interface RankingTypeGlobal {
  id: string;
  label: string;
  elements: RankingElementGlobal[];
  render(): React.ReactNode;
}
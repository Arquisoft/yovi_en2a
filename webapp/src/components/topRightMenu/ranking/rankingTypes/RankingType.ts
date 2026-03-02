import type { RankingElement } from "../RankingElement";
import React from 'react';

export interface RankingType {
  id: string;
  label: string;
  elements: RankingElement[];
  render(): React.ReactNode;
}
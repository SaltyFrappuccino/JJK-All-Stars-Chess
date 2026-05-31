export type AbilityInfo = {
  label: string;
  cost: number | null;
  summary: string;
  usage: string;
};

export type StatusInfo = {
  kind: string;
  label: string;
  description: string;
};

export type FaqPiece = {
  name: string;
  role: string;
  summary: string;
  techniqueKeys: string[];
  domainName?: string;
};

/* Beat 3 — Reveal. The name lands, and the first characters arrive:
   three badges popping in from the edges with speed-dashes, then
   bobbing out of phase through the hold. */
import React from 'react';
import { BLOCKS } from '../tokens';
import { useFrameCtx } from '../components/Frame';
import { Statement } from '../components/Statement';
import { Badge } from '../components/Badge';

const by = (id: string) => BLOCKS.find((b) => b.id === id)!;

export const S3Reveal: React.FC = () => {
  const { u, W, H, wide } = useFrameCtx();
  return (
    <>
      <Statement lines={['Meet', 'Context Studio.']} />
      <Badge accent={by('ontology').accent} icon="graph" d={150}
        x={W * (wide ? 0.13 : 0.16)} y={H * 0.14}
        at={6} from={{ x: -180 * u, y: -140 * u }} bobAt={54} bobPhase={0} />
      <Badge accent={by('data').accent} icon="database" d={150}
        x={W * (wide ? 0.86 : 0.8)} y={H * 0.84}
        at={20} from={{ x: 180 * u, y: 150 * u }} bobAt={54} bobPhase={2.1} />
      <Badge accent={by('policies').accent} icon="shield" d={110}
        x={W - 30 * u} y={H * 0.42}
        at={34} from={{ x: 200 * u, y: 0 }} bobAt={54} bobPhase={4.2} />
    </>
  );
};

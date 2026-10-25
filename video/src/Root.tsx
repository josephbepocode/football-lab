import React from 'react';
import { Composition } from 'remotion';
import { TableRace, ShotTimeline, RadarCompare, ClasicoXG } from './clips';
const FPS = 30;
const CLIPS = [['TableRace', TableRace, 13], ['ShotTimeline', ShotTimeline, 12], ['RadarCompare', RadarCompare, 12], ['ClasicoXG', ClasicoXG, 13]] as const;
const SIZES = [['Landscape', 1920, 1080], ['Portrait', 1080, 1350]] as const;
export const Root: React.FC = () => <>{CLIPS.flatMap(([id, C, s]) => SIZES.map(([sz, w, h]) =>
  <Composition key={id + sz} id={`${id}-${sz}`} component={C as any} durationInFrames={s * FPS} fps={FPS} width={w} height={h} />))}</>;

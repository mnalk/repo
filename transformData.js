import {
  timeParse,
  utcWeek,
  utcWeeks,
  group,
  stack,
  extent,
  stackOffsetWiggle,
  stackOrderAppearance,
} from 'd3';
import { blur } from 'array-blur';

const parseDate = timeParse('%Y-%m-%d');

// Dedupe 'Michael Bostock' (earlier Git username) and 'Mike Bostock'.
const layer = (d) =>
  d.author === 'Michael Bostock'
    ? 'Mike Bostock'
    : d.author;

export const transformData = (data) => {
  data.forEach((d) => {
    d.date = utcWeek.floor(parseDate(d.date.split(' ')[0]));
  });

  // Aggregate by month and repository.
  const groupedData = group(data, (d) => d.date, layer);

  const layerGroupedData = group(data, layer);

  const layers = Array.from(layerGroupedData.keys());

  const [start, stop] = extent(data, (d) => d.date);
  const allWeeks = utcWeeks(start, stop);

  const dataBylayer = new Map();

  const visibleLayers = [];

  for (let layer of layers) {
    let sum = 0;
    const layerData = allWeeks.map((date) => {
      const value = groupedData.get(date);
      const commits = value ? value.get(layer) : null;
      const commitCount = commits ? commits.length : 0;
      sum += commitCount;
      return commitCount;
    });

    // Prune the list of contributors to only those
    // with 3 or more commits. Without this filter, there
    // are performance issues with rendering so many layers.
    if (sum >= 3) {
      // Apply smoothing
      const smoothedLayerData = blur().radius(20)(
        layerData
      );

      dataBylayer.set(layer, smoothedLayerData);

      visibleLayers.push(layer);
    }
  }

  console.log(visibleLayers.length);

  const transformedData = [];
  allWeeks.forEach((date, i) => {
    const row = { date };
    for (let layer of visibleLayers) {
      row[layer] = dataBylayer.get(layer)[i];
    }
    transformedData.push(row);
  });

  const stackedData = stack()
    .offset(stackOffsetWiggle)
    .order(stackOrderAppearance)
    .keys(visibleLayers)(transformedData);

  return { data, stackedData };
};

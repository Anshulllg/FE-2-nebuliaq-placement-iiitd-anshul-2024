import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './../App.css'; // Import the CSS file for card styles

const createGradient = (svg, id, successRatio) => {
  svg.append('defs')
    .append('linearGradient')
    .attr('id', id)
    .attr('x1', '0%')
    .attr('x2', '100%')
    .attr('y1', '0%')
    .attr('y2', '0%')
    .selectAll('stop')
    .data([
      { offset: `${successRatio}%`, color: 'green' },
      { offset: `${successRatio}%`, color: 'red' }
    ])
    .enter()
    .append('stop')
    .attr('offset', d => d.offset)
    .attr('stop-color', d => d.color);
};

const drawNodes = (svg, nodes, colorScale, nodeRadius, showCard) => {
  const nodeGroup = svg.append('g').attr('class', 'nodes');

  const node = nodeGroup
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node');

  node.each(d => {
    const gradientId = `grad-${d.name.replace(/\s+/g, '-')}`;
    createGradient(svg, gradientId, d.successRatio);
  });

  node.append('circle')
    .attr('r', nodeRadius)
    .attr('fill', d => colorScale(d.type))
    .attr('stroke-width', 4)
    .attr('stroke', d => `url(#grad-${d.name.replace(/\s+/g, '-')})`);

  node.append('image')
    .attr('xlink:href', d => `/icons/${d.type}.png`)
    .attr('x', -20)
    .attr('y', -20)
    .attr('width', 40)
    .attr('height', 40);

  node.append('text')
    .selectAll('tspan')
    .data(d => [
      { text: `Service: ${d.name}`, color: 'black', cardType: 'service' },
      { text: `Port: ${d.port}`, color: 'blue', cardType: 'service' },
      { text: `Namespace: ${d.namespace}`, color: 'purple', cardType: 'service' },
      { text: `Cluster: ${d.cluster}`, color: 'orange', cardType: 'service' },
      { text: `Invocations: ${d.totalInvocations}`, color: 'darkgreen', cardType: 'metrics' }
    ])
    .enter()
    .append('tspan')
    .attr('x', 35)
    .attr('dy', (d, i) => `${1.5}em`)
    .text(d => d.text)
    .attr('font-size', '12px')
    .attr('fill', d => d.color)
    .on('mouseover', (event, d) => {
      showCard(d.text, d.cardType, event.pageX, event.pageY);
    })
    .on('mouseout', () => {
      // hideCard();
    });

  return node;
};

const drawEdges = (svg, edges) => {
  svg.append('defs').append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 4)
    .attr('refY', 5)
    .attr('markerWidth', 5)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', 'black');

  const linkGroup = svg.append('g').attr('class', 'links');

  const link = linkGroup
    .selectAll('line')
    .data(edges)
    .enter()
    .append('line')
    .attr('stroke', d => d.color)
    .attr('stroke-width', d => Math.sqrt(d.invocations))
    .attr('stroke-opacity', 0.6)
    .attr('marker-end', 'url(#arrow)');

  return link;
};

const updateLinks = (link, nodeRadius) => {
  link
    .attr('x1', d => {
      const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x);
      return d.source.x + nodeRadius * Math.cos(angle);
    })
    .attr('y1', d => {
      const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x);
      return d.source.y + nodeRadius * Math.sin(angle);
    })
    .attr('x2', d => {
      const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x);
      return d.target.x - nodeRadius * Math.cos(angle);
    })
    .attr('y2', d => {
      const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x);
      return d.target.y - nodeRadius * Math.sin(angle);
    });
};

const ServiceGraph = () => {
  const svgRef = useRef();
  const [forceStrength, setForceStrength] = useState(-300);
  const [cardContent, setCardContent] = useState('');
  const [cardType, setCardType] = useState('');
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });

  const showCard = (content, type, x, y) => {
    setCardContent(content);
    setCardType(type);
    setCardPosition({ x, y });
  };

  const hideCard = () => {
    setCardContent('');
  };

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/serviceGraphData.json');
      const data = await response.json();
      drawGraph(data);
    };

    const drawGraph = (data) => {
      const svg = d3.select(svgRef.current);
      const width = svgRef.current.clientWidth;
      const height = svgRef.current.clientHeight;

      svg.selectAll('*').remove(); 

      const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      const nodeRadius = 30;

      const simulation = d3.forceSimulation(data)
        .force('charge', d3.forceManyBody().strength(forceStrength))
        .force('link', d3.forceLink().id(d => d.name).distance(150))
        .force('center', d3.forceCenter(width / 2, height / 2));

      const nodes = data.map(d => ({
        ...d,
        totalInvocations: d.invocations,
        successRatio: d.invocations > 0 ? (d.invocations - d.errors) / d.invocations * 100 : 100
      }));

      const node = drawNodes(svg, nodes, colorScale, nodeRadius, showCard);

      const edges = nodes.flatMap(node => node.edges.map(edge => ({
        source: nodes.find(n => n.name === node.name),
        target: nodes.find(n => n.name === edge.target),
        invocations: edge.invocations,
        latency: edge.latency,
        color: colorScale(node.type)
      })));

      const link = drawEdges(svg, edges);

      svg.append('g')
        .attr('class', 'edge-labels')
        .selectAll('text')
        .data(edges)
        .enter()
        .append('text')
        .attr('font-size', '10px')
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .text(d => `Invocations: ${d.invocations}, Latency: ${d.latency}ms`);

      simulation.nodes(nodes).on('tick', () => {
        node.attr('transform', d => `translate(${d.x},${d.y})`);
        updateLinks(link, nodeRadius);
        svg.selectAll('.edge-labels text')
          .attr('x', d => (d.source.x + d.target.x) / 2)
          .attr('y', d => (d.source.y + d.target.y) / 2);
      });

      
    };

    fetchData();
  }, [forceStrength]);

  const handleSliderChange = (event) => {
    setForceStrength(parseInt(event.target.value, 10));
  };

  return (
    <div className="relative w-screen h-screen overflow-auto bg-white">
      <h1 className="absolute top-4 left-4 text-2xl font-bold">Node Service Graph</h1>
      <div className="absolute top-4 right-4 flex items-center">
        <label htmlFor="force-slider" className="mr-2">Node Strength:</label>
        <input
          id="force-slider"
          type="range"
          min="-600"
          max="0"
          value={forceStrength}
          onChange={handleSliderChange}
          className="w-48"
        />
      </div>
      <svg ref={svgRef} className="w-full h-full"></svg>
      {cardContent && (
        <div
          className="card"
          style={{ left: `${cardPosition.x}px`, top: `${cardPosition.y}px` }}
        >
          <h3>{cardType === 'service' ? 'Service Details' : 'Metrics'}</h3>
          <p>{cardContent}</p>
        </div>
      )}
    </div>
  );
};

export default ServiceGraph;

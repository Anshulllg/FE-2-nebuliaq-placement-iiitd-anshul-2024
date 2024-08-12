import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ServiceGraph = () => {
  const svgRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/serviceGraphData.json');
      const data = await response.json();
      drawGraph(data);
    };

    fetchData();

    const drawGraph = (data) => {
      const svg = d3.select(svgRef.current);
      const width = svgRef.current.clientWidth;
      const height = svgRef.current.clientHeight;

      svg.selectAll('*').remove(); 

      const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      const simulation = d3.forceSimulation(data)
        .force('charge', d3.forceManyBody().strength(-100))
        .force('link', d3.forceLink().distance(100).id(d => d.name))
        .force('center', d3.forceCenter(width / 2, height / 2));

      const createGradient = (id, successRatio) => {
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

   
      const node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'node');

      node.each(d => {
 
        const successRatio = (10-d.error ) * 10;
        const errorRatio = (d.error ) * 10;
        const gradientId = `grad-${d.name.replace(/\s+/g, '-')}`;

        createGradient(gradientId, successRatio,errorRatio);

        d3.select(`#${gradientId}`)
          .selectAll('stop')
          .data([
            { offset: `${successRatio}%`, color: 'green' },
            { offset: `${errorRatio}%`, color: 'red' }
          ])
          .enter()
          .append('stop')
          .attr('offset', d => d.offset)
          .attr('stop-color', d => d.color);
      });

      node.append('circle')
        .attr('r', 30)
        .attr('fill', d => colorScale(d.type))
        .attr('stroke-width', 2)
        .attr('stroke', d => `url(#grad-${d.name.replace(/\s+/g, '-')})`);

      node.append('image')
        .attr('xlink:href', d => `/icons/${d.type}.svg`) 
        .attr('x', -20) 
        .attr('y', -20) 
        .attr('width', 40) 
        .attr('height', 40); 

      node.append('text')
        .selectAll('tspan')
        .data(d => [
          { text: `Service: ${d.name}`, color: 'black' },
          { text: `Port: ${d.port}`, color: 'blue' },
          { text: `Namespace: ${d.namespace}`, color: 'purple' },
          { text: `Cluster: ${d.cluster}`, color: 'orange' },
          { text: `Invocations: ${d.invocations}`, color: 'darkgreen' }
        ])
        .enter()
        .append('tspan')
        .attr('x', 35)
        .attr('dy',`${1.5}em`) 
        .text(d => d.text)
        .attr('fill', d => d.color);


      simulation.nodes(data).on('tick', () => {
        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });


    };

  }, []);

  return (
    <svg ref={svgRef} className="w-screen h-screen bg-white"></svg>
  );
};

export default ServiceGraph;

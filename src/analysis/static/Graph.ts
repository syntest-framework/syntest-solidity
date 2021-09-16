/**
 * Generic graph class.
 *
 * @author Mitchell Olsthoorn
 */
export class Graph<T> {
  protected _adjacencyMap: Map<T, Set<T>>;

  constructor() {
    this._adjacencyMap = new Map<T, Set<T>>();
  }

  addNode(node: T): void {
    if (!this._adjacencyMap.has(node))
      this._adjacencyMap.set(node, new Set<T>());
  }

  getNodes(): T[] {
    return Array.from(this._adjacencyMap.keys());
  }

  addEdge(source: T, destination: T): void {
    this.addNode(source);
    this.addNode(destination);
    this._adjacencyMap.get(source).add(destination);
  }

  getAdjacentNodes(node: T): T[] {
    return Array.from(this._adjacencyMap.get(node));
  }
}

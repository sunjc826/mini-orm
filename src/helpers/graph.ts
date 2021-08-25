// Modified from https://www.geeksforgeeks.org/topological-sorting-indegree-based-solution/
// This code is contributed by avanitrachhadiya2155

// Note: I'm too lazy to revise graphs to implement this myself lol

// A Javascript program to print topological
// sorting of a graph using indegrees

export class Graph<T extends string> {
  // No. of vertices
  V: number;

  // An Array of List which contains
  // references to the Adjacency List of
  // each vertex
  adj: Array<any>;
  initialized: boolean = false;
  // maps vertex index to a value
  record: Array<T>;
  sorted: Array<number>;
  indexOf: Record<string, number> = {};

  constructor(v?: number, data?: Array<T>) {
    if (v) {
      this.setVertexCount(v);
      if (data) {
        let i = 0;
        for (const ele of data) {
          this.setRecord(i, ele);
          i++;
        }
      }
    }
  }

  setVertexCount(v: number) {
    this.initialized = true;
    this.V = v;
    this.adj = new Array(this.V);
    this.record = new Array(this.V);
    for (let i = 0; i < this.V; i++) this.adj[i] = [];
  }

  setRecord(index: number, value: T) {
    this.record[index] = value;
    this.indexOf[value] = index;
  }

  /**
   * Returns the array index corresponding to the given value.
   * @param value
   * @returns Array index.
   */
  getIndexOf(value: T) {
    return this.indexOf[value];
  }

  /**
   * Returns the value mapped to the given array index.
   * @param index Array index.
   * @returns Value mapped to the given array index.
   */
  getValue(index: number) {
    return this.record[index];
  }

  getSortedIndices() {
    this.topologicalSort();
    return this.sorted;
  }

  getSortedValues() {
    this.topologicalSort();
    return this.sorted.map((ele) => this.getValue(ele));
  }

  addEdge(u: number, v: number) {
    this.adj[u].push(v);
  }

  addEdgeByValue(from: T, to: T) {
    this.addEdge(this.getIndexOf(from), this.getIndexOf(to));
  }

  topologicalSort() {
    if (!this.initialized) {
      throw new Error("vertex count not yet set");
    }
    // Create a array to store
    // indegrees of all
    // vertices. Initialize all
    // indegrees as 0.
    let indegree = new Array(this.V);
    for (let i = 0; i < this.V; i++) indegree[i] = 0;

    // Traverse adjacency lists
    // to fill indegrees of
    // vertices. This step takes
    // O(V+E) time
    for (let i = 0; i < this.V; i++) {
      let temp = this.adj[i];
      for (let node = 0; node < temp.length; node++) {
        indegree[temp[node]]++;
      }
    }

    // Create a queue and enqueue
    // all vertices with indegree 0
    let q = [];
    for (let i = 0; i < this.V; i++) {
      if (indegree[i] == 0) q.push(i);
    }

    // Initialize count of visited vertices
    let cnt = 0;

    // Create a vector to store result
    // (A topological ordering of the vertices)
    let topOrder = [];
    while (q.length != 0) {
      // Extract front of queue
      // (or perform dequeue)
      // and add it to topological order
      let u: number = q.shift();
      topOrder.push(u);

      // Iterate through all its
      // neighbouring nodes
      // of dequeued node u and
      // decrease their in-degree
      // by 1
      for (let node = 0; node < this.adj[u].length; node++) {
        // If in-degree becomes zero,
        // add it to queue
        if (--indegree[this.adj[u][node]] == 0) q.push(this.adj[u][node]);
      }
      cnt++;
    }

    // Check if there was a cycle
    if (cnt != this.V) {
      throw new Error("There exists a cycle in the graph");
    }
    this.sorted = topOrder;
    return topOrder;
  }
}

import {
  Encoding,
  SearchSubject,
  BranchDistance,
  ProbeObjectiveFunction,
  Node,
} from "@syntest-framework/syntest-framework";

export class RequireObjectiveFunction<
  T extends Encoding
> extends ProbeObjectiveFunction<T> {
  constructor(
    subject: SearchSubject<T>,
    id: string,
    line: number,
    locationIdx: number,
    type: boolean
  ) {
    super(subject, id, line, locationIdx, type);
  }

  calculateDistance(encoding: T): number {
    const executionResult = encoding.getExecutionResult();

    if (executionResult === undefined) {
      return Number.MAX_VALUE;
    }

    if (executionResult.coversLine(this._line)) {
      const postCondition = executionResult
        .getTraces()
        .find(
          (trace) => trace.type === "probePost" && trace.line === this._line
        );

      const preCondition = executionResult
        .getTraces()
        .find(
          (trace) => trace.type === "probePre" && trace.line === this._line
        );

      if (this.type) {
        if (postCondition.hits > 0) return 0;
        else {
          if (preCondition.hits > 0) {
            return BranchDistance.branchDistanceNumeric(
              preCondition.opcode,
              preCondition.left,
              preCondition.right,
              true
            );
          }
        }
      } else {
        return BranchDistance.branchDistanceNumeric(
          preCondition.opcode,
          preCondition.left,
          preCondition.right,
          false
        );
      }
    }

    // find the corresponding branch node inside the cfg
    const branchNode = this._subject.cfg.nodes.find((n: Node) => {
      return n.locationIdx === this._locationIdx && n.line === this._line;
    });

    // find the closest covered branch to the objective branch
    let closestHitNode = null;
    let approachLevel = Number.MAX_VALUE;
    for (const n of this._subject.cfg.nodes) {
      const traces = executionResult
        .getTraces()
        .filter(
          (trace) =>
            trace.line === n.line &&
            (trace.type === "branch" ||
              trace.type === "probePre" ||
              trace.type === "probePost" ||
              trace.type === "function") &&
            trace.hits > 0
        );
      for (const trace of traces) {
        const pathDistance = this._subject.getPath(n.id, branchNode.id);
        if (approachLevel > pathDistance) {
          approachLevel = pathDistance;
          closestHitNode = trace;
        }
      }
    }

    // if closer node (branch or probe) is not found, we return the distance to the root branch
    if (!closestHitNode) {
      return Number.MAX_VALUE;
    }

    let branchDistance: number;

    if (closestHitNode.type === "function") branchDistance = 1;
    else branchDistance = this.computeBranchDistance(closestHitNode);

    // add the distances
    const distance = approachLevel + branchDistance;
    return distance;
  }

  getIdentifier(): string {
    return this._id;
  }

  getSubject(): SearchSubject<T> {
    return this._subject;
  }

  get type(): boolean {
    return this._type;
  }
}

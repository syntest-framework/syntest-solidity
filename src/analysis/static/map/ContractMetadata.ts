/**
 * Interface for Solidity contract metadata.
 *
 * @author Mitchell Olsthoorn
 */
export interface ContractMetadata {
  /**
   * Name of the contract.
   */
  name: string;

  /**
   * Kind of contract: "contract", "library", "interface".
   */
  kind: ContractKind;

  /**
   * The contracts this contracts extends from.
   */
  bases: string[];
}

export enum ContractKind {
  Contract = "contract",
  Library = "library",
  Interface = "interface",
}

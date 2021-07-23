import {
  prng
} from "syntest-framework"

/**
 * A pool with constants extracted from the subject under test.
 *
 * @author Mitchell Olsthoorn
 */
export class ConstantPool {

  protected addressPool = new Set<string>();
  protected numberPool = new Set<number>();
  protected stringPool = new Set<string>();

  addAddress(value: string): void {
    this.addressPool.add(value)
  }

  getAddress(): string {
    return prng.pickOne(Array.from(this.addressPool))
  }

  addNumber(value: number): void {
    this.numberPool.add(value);
  }

  getNumber(): number {
    return prng.pickOne(Array.from(this.numberPool))
  }

  addString(value: string): void {
    this.stringPool.add(value);
  }

  getString(): number {
    return prng.pickOne(Array.from(this.stringPool))
  }
}

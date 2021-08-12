import { prng } from "syntest-framework";

/**
 * A pool with constants extracted from the subject under test.
 *
 * @author Mitchell Olsthoorn
 */
export class ConstantPool {
  private static instance: ConstantPool;

  protected addressPool = new Set<string>();
  protected numberPool = new Set<number>();
  protected stringPool = new Set<string>();

  private constructor() {
  }

  /**
   * The static method that controls the access to the singleton instance.
   *
   * This implementation let you subclass the Singleton class while keeping
   * just one instance of each subclass around.
   */
  public static getInstance(): ConstantPool {
    if (!ConstantPool.instance) {
      ConstantPool.instance = new ConstantPool();
    }

    return ConstantPool.instance;
  }

  addAddress(value: string): void {
    this.addressPool.add(value);
  }

  getAddress(): string {
    return prng.pickOne(Array.from(this.addressPool));
  }

  addNumber(value: number): void {
    this.numberPool.add(value);
  }

  getNumber(): number {
    return prng.pickOne(Array.from(this.numberPool));
  }

  addString(value: string): void {
    this.stringPool.add(value);
  }

  getString(): string {
    return prng.pickOne(Array.from(this.stringPool));
  }
}

class Base {
  name(): string {
    return 'base';
  }
}

export class Child extends Base {
  name(): string {
    return 'child';
  }
}

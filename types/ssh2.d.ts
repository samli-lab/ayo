declare module 'ssh2' {
  export class Client {
    constructor()
    connect(config: any): void
    on(event: string, callback: (...args: any[]) => void): void
    forwardOut(
      srcIP: string,
      srcPort: number,
      dstIP: string,
      dstPort: number,
      callback: (err: Error | null, stream: any) => void
    ): void
    end(): void
  }
}

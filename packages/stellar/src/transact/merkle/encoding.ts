import { Buffer } from 'buffer';

const FR_ORDER =
  0x73_ed_a7_53_29_9d_7d_48_33_39_d8_08_09_a1_d8_05_53_bd_a4_02_ff_fe_5b_fe_ff_ff_ff_ff_00_00_00_01n;

function bufferToDecimal(buf: Buffer): string {
  const hex = buf.toString('hex');
  const bigintFromHex = BigInt(`0x${hex}`);
  const reduced = bigintFromHex % FR_ORDER;
  return reduced.toString();
}

export function commitmentsBuffersToDecimal(buffers: Buffer[]): string[] {
  return buffers.map((bufferRow) => bufferToDecimal(bufferRow));
}

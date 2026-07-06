const BN254_SCALAR_MOD =
  21_888_242_871_839_275_222_246_405_745_257_275_088_548_364_400_416_034_343_698_204_186_575_808_495_617n;
const FIELD_BYTE_LENGTH = 32;
const BYTE_MASK = 0xffn;
const BITS_PER_BYTE = 8n;

export function frDecimalToPaddedBytes32(decimal: string): Buffer {
  let value = BigInt(decimal.trim());
  value = ((value % BN254_SCALAR_MOD) + BN254_SCALAR_MOD) % BN254_SCALAR_MOD;
  const bytes = Buffer.alloc(FIELD_BYTE_LENGTH);
  for (let index = FIELD_BYTE_LENGTH - 1; index >= 0; index -= 1) {
    bytes[index] = Number(value & BYTE_MASK);
    value >>= BITS_PER_BYTE;
  }
  return bytes;
}

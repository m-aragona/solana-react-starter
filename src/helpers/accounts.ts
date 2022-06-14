import {
  Keypair,
  PublicKey,
  SystemProgram,
  AccountInfo,
} from '@solana/web3.js';
import {
  CANDY_MACHINE,
  CANDY_MACHINE_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  FAIR_LAUNCH_PROGRAM_ID,
  AUCTION_HOUSE_PROGRAM_ID,
  AUCTION_HOUSE,
  FEE_PAYER,
  TREASURY,
  WRAPPED_SOL_MINT,
  TOKEN_ENTANGLEMENT_PROGRAM_ID,
  TOKEN_ENTANGLER,
  ESCROW,
  B,
  A,
  CANDY_MACHINE_PROGRAM_V2_ID,
} from './constants';
import * as anchor from '@project-serum/anchor';
import { createCandyMachineV2Account } from './instructions';
import { web3 } from '@project-serum/anchor';
import log from 'loglevel';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
export type AccountAndPubkey = {
  pubkey: string;
  account: AccountInfo<Buffer>;
};


export interface WhitelistMintMode {
  neverBurn: undefined | boolean;
  burnEveryTime: undefined | boolean;
}

export interface CandyMachine {
  authority: anchor.web3.PublicKey;
  wallet: anchor.web3.PublicKey;
  tokenMint: null | anchor.web3.PublicKey;
  itemsRedeemed: anchor.BN;
  data: CandyMachineData;
}
export interface CandyMachineData {
  itemsAvailable: anchor.BN;
  uuid: null | string;
  symbol: string;
  sellerFeeBasisPoints: number;
  isMutable: boolean;
  maxSupply: anchor.BN;
  price: anchor.BN;
  retainAuthority: boolean;
  gatekeeper: null | {
    expireOnUse: boolean;
    gatekeeperNetwork: web3.PublicKey;
  };
  goLiveDate: null | anchor.BN;
  endSettings: null | [number, anchor.BN];
  whitelistMintSettings: null | {
    mode: WhitelistMintMode;
    mint: anchor.web3.PublicKey;
    presale: boolean;
    discountPrice: null | anchor.BN;
  };
  hiddenSettings: null | {
    name: string;
    uri: string;
    hash: Uint8Array;
  };
  creators: {
    address: PublicKey;
    verified: boolean;
    share: number;
  }[];
}

export const createCandyMachineV2 = async function (
  anchorProgram: anchor.Program,
  payerWallet: Keypair,
  treasuryWallet: PublicKey,
  splToken: PublicKey,
  candyData: CandyMachineData,
) {
  const candyAccount = Keypair.generate();
  candyData.uuid = uuidFromConfigPubkey(candyAccount.publicKey);

  if (!candyData.symbol) {
    throw new Error(`Invalid config, there must be a symbol.`);
  }

  if (!candyData.creators || candyData.creators.length === 0) {
    throw new Error(`Invalid config, there must be at least one creator.`);
  }

  const totalShare = (candyData.creators || []).reduce(
    (acc, curr) => acc + curr.share,
    0,
  );

  if (totalShare !== 100) {
    throw new Error(`Invalid config, creators shares must add up to 100`);
  }

  const remainingAccounts = [];
  if (splToken) {
    remainingAccounts.push({
      pubkey: splToken,
      isSigner: false,
      isWritable: false,
    });
  }
  return {
    candyMachine: candyAccount.publicKey,
    uuid: candyData.uuid,
    txId: await anchorProgram.rpc.initializeCandyMachine(candyData, {
      accounts: {
        candyMachine: candyAccount.publicKey,
        wallet: treasuryWallet,
        authority: payerWallet.publicKey,
        payer: payerWallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [payerWallet, candyAccount],
      remainingAccounts:
        remainingAccounts.length > 0 ? remainingAccounts : undefined,
      instructions: [
        await createCandyMachineV2Account(
          anchorProgram,
          candyData,
          payerWallet.publicKey,
          candyAccount.publicKey,
        ),
      ],
    }),
  };
};

export function uuidFromConfigPubkey(configAccount: PublicKey) {
  return configAccount.toBase58().slice(0, 6);
}

export async function getProgramAccounts(
  connection: anchor.web3.Connection,
  programId: string,
  configOrCommitment?: any,
): Promise<AccountAndPubkey[]> {
  const extra: any = {};
  let commitment;
  //let encoding;

  if (configOrCommitment) {
    if (typeof configOrCommitment === 'string') {
      commitment = configOrCommitment;
    } else {
      commitment = configOrCommitment.commitment;
      //encoding = configOrCommitment.encoding;

      if (configOrCommitment.dataSlice) {
        extra.dataSlice = configOrCommitment.dataSlice;
      }

      if (configOrCommitment.filters) {
        extra.filters = configOrCommitment.filters;
      }
    }
  }

  const args = connection._buildArgs([programId], commitment, 'base64', extra);
  const unsafeRes = await (connection as any)._rpcRequest(
    'getProgramAccounts',
    args,
  );

  return unsafeResAccounts(unsafeRes.result);
}

function unsafeAccount(account: anchor.web3.AccountInfo<[string, string]>) {
  return {
    // TODO: possible delay parsing could be added here
    data: Buffer.from(account.data[0], 'base64'),
    executable: account.executable,
    lamports: account.lamports,
    // TODO: maybe we can do it in lazy way? or just use string
    owner: account.owner,
  } as anchor.web3.AccountInfo<Buffer>;
}

function unsafeResAccounts(
  data: Array<{
    account: anchor.web3.AccountInfo<[string, string]>;
    pubkey: string;
  }>,
) {
  return data.map(item => ({
    account: unsafeAccount(item.account),
    pubkey: item.pubkey,
  }));
}

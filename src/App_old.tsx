import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
    GlowWalletAdapter,
    PhantomWalletAdapter,
    SlopeWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { Program, Provider, web3, BN } from '@project-serum/anchor';
import { clusterApiUrl, Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import React, { FC, ReactNode, useMemo } from 'react';
import idl from './idl.json'
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    Account,
    createSetAuthorityInstruction,
    AuthorityType,
    createInitializeMintInstruction,
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress
} from '@solana/spl-token';
import { createVerifyCollectionInstruction } from './helpers/VerifyCollection'

require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');

const App: FC = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};
export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Mainnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
    // Only the wallets you configure here will be compiled into your application, and only the dependencies
    // of wallets that your users connect to will be loaded.
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new GlowWalletAdapter(),
            new SlopeWalletAdapter(),
            new SolflareWalletAdapter({ network }),
            new TorusWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

const Content: FC = () => {
    const wallet = useAnchorWallet();

    const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    function getProvider() {
        if (!wallet) {
            return null
        }
        // create the provider and return it to the caller
        // network set to devnet..
        const network = clusterApiUrl('mainnet-beta')
        const connection = new Connection(network, 'processed')

        const provider = new Provider(
            connection, wallet, { "preflightCommitment": "processed" },
        )
        return provider;
    }

    async function soSomething() {

        const provider = getProvider()

        if (!provider) {
            throw ("Provider is null")
        }
        // create the program interface combining the idl, program ID and provider

        //Bug with default importing when handling string value types
        const a = JSON.stringify(idl);
        const b = JSON.parse(a)
        const program = new Program(b, idl.metadata.address, provider)


        //const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        var recieverWallet = new PublicKey("8xSyMdKQNCkRJB7LiebZ2yu26PTURxyRG7oS6f8Y4JUc");

        let transaction = new Transaction();

        //const private_key_bytes = [240,239,30,228,114,38,221,180,25,247,255,68,156,85,23,175,200,243,200,40,62,65,105,141,245,32,17,99,232,244,125,67,131,240,86,211,189,21,27,53,132,17,4,184,176,155,222,231,196,189,135,160,190,152,241,221,86,50,222,20,58,65,57,33]

        const mintKeypair = Keypair.generate();

        //const mintKeypair = { publicKey: new PublicKey('AbqRanLfLvKhHihGZEPbk674TNLmavNdXkt4JuZta8Nd') }
        console.log('Pub Key MintKeypair', mintKeypair.publicKey)
        //console.log('Pub Key MintKeypair', mintKeypair.secretKey)

        const s_key = process.env.REACT_APP_SECRET_KEY

        if (s_key) {
            let seed = Uint8Array.from(
                // s_key.split(",")
                [240, 239, 30, 228, 114, 38, 221, 180, 25, 247, 255, 68, 156, 85, 23, 175, 200, 243, 200, 40, 62, 65, 105, 141, 245, 32, 17, 99, 232, 244, 125, 67, 131, 240, 86, 211, 189, 21, 27, 53, 132, 17, 4, 184, 176, 155, 222, 231, 196, 189, 135, 160, 190, 152, 241, 221, 86, 50, 222, 20, 58, 65, 57, 33]
            ).slice(0, 32);
            let KEYPAIRS = web3.Keypair.fromSeed(seed);
        }
        // create keypairs



        const nftTokenAccount = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            wallet!.publicKey
        );

        console.log('nftTokenAccount', nftTokenAccount.toString())

        const requiredLamports: number = await program.provider.connection.getMinimumBalanceForRentExemption(
            MINT_SIZE
        );

        console.log(wallet!.publicKey)
        console.log(mintKeypair.publicKey)
        console.log(MINT_SIZE)
        console.log(TOKEN_PROGRAM_ID)
        console.log('req lamports', requiredLamports)

        transaction.add(

            SystemProgram.createAccount({
                fromPubkey: wallet!.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: MINT_SIZE,
                programId: TOKEN_PROGRAM_ID,
                lamports: requiredLamports,
            }),
            createInitializeMintInstruction(
                mintKeypair.publicKey,
                0,
                wallet!.publicKey,
                wallet!.publicKey
            ),
            createAssociatedTokenAccountInstruction(
                wallet!.publicKey,
                nftTokenAccount,
                wallet!.publicKey,
                mintKeypair.publicKey
            )
        );


        transaction.feePayer = wallet!.publicKey;
        const anyTransaction: any = transaction;
        anyTransaction.recentBlockhash = (
            await provider.connection.getLatestBlockhash()
        ).blockhash;

        transaction.partialSign(mintKeypair)

        if (!transaction) return;
        let signed = await wallet!.signTransaction(transaction);
        console.log("Got signature, submitting transaction");
        let signature = await provider.connection.sendRawTransaction(signed.serialize());
        console.log("Submitted transaction " + signature + ", awaiting confirmation");
        await provider.connection.confirmTransaction(signature);
        console.log("Transaction " + signature + " confirmed");


        const metadataAddress = (await web3.PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        ))[0];

        console.log('metadata Address', metadataAddress.toString())

        const masterEditionAddress = (await web3.PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
                Buffer.from("edition"),
            ],
            TOKEN_METADATA_PROGRAM_ID
        ))[0];
        console.log('metadata Edition Address', masterEditionAddress.toString())

        const nftMetadataUri = "https://gateway.pinata.cloud/ipfs/QmP6thVszVMTQtw5zuFQjV5DU1Ddb7UaZzsvWadJvNTdPY/2.json";
        const nftTitle = "Surf3";

        // const collection_mint = new PublicKey("Fax4iVCxsQboHVVevwmZdxxPaUW8UMRzxSZVotjb6x1X")
        // const collection_update_auth = new PublicKey("8xSyMdKQNCkRJB7LiebZ2yu26PTURxyRG7oS6f8Y4JUc")
        // const collection_metadata_address = new PublicKey("3WTR93hWkeH1puXmwkHNQuVHxWMBH1WDqeMn7mas5X6o")
        // const collection_master_edition = new PublicKey("5qfejuQqwFX1MVcphNpTMMPWBP1vg85QpRi9WDvYE2UU")

        const collection_mint = new PublicKey("48bL4xA4orAR1Ypn4JGvhz4qbf3yY5cuJpyEa4UuAQmJ")
        const collection_update_auth = new PublicKey("5ymCqhEd8u8NtnfWnyF1JxoTCfNbhSKJLk5A4mrLase7")
        const collection_metadata_address = new PublicKey("5vrqvRNTtxtgQjkfpysoswTQsDTLXqwZ4CtmLPRQERxr")
        const collection_master_edition = new PublicKey("6ZxGSRusLDcAhATRSuNxmMtjuA58zPpymYwbjDKuEvAG")

        console.log(collection_mint)
        console.log(mintKeypair.publicKey)

        await program.methods.mintNft(
            mintKeypair.publicKey,
            nftMetadataUri,
            nftTitle,
        )
            .accounts({
                mintAuthority: wallet!.publicKey,
                mint: mintKeypair.publicKey,
                tokenAccount: nftTokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                metadata: metadataAddress,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                payer: wallet!.publicKey,
                systemProgram: web3.SystemProgram.programId,
                rent: web3.SYSVAR_RENT_PUBKEY,
                masterEdition: masterEditionAddress,
                collectionUpdateAuth: wallet!.publicKey,
                collectionMint: collection_mint,
                collectionMetadata: collection_metadata_address,
                collectionMasterEd: collection_master_edition,
            })
            .rpc();
    }


    async function createCollectionNFT() {

        const provider = getProvider()

        if (!provider) {
            throw ("Provider is null")
        }
        // create the program interface combining the idl, program ID and provider

        //Bug with default importing when handling string value types
        const a = JSON.stringify(idl);
        const b = JSON.parse(a)
        const program = new Program(b, idl.metadata.address, provider)

        const mintKeypair = Keypair.generate();
        const tokenAddress = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            wallet!.publicKey,
        )

        console.log('Pub Key MintKeypair', mintKeypair.publicKey)

        const metadataAddress = (await web3.PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        ))[0];

        console.log('metadata Address', metadataAddress.toString())

        const masterEditionAddress = (await web3.PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
                Buffer.from("edition"),
            ],
            TOKEN_METADATA_PROGRAM_ID
        ))[0];
        console.log('metadata Edition Address', masterEditionAddress.toString())

        const nftMetadataUri = "https://gateway.pinata.cloud/ipfs/QmeJ4UcRwXddwUWwbo2A87x3EVxHELCmdsWgYpjR9WzWho/coleccion.json";
        const nftTitle = "Solana Collection Test";

        console.log(mintKeypair.publicKey)
        console.log(program.programId)


        program.methods.mintCollection(
            nftMetadataUri,
            nftTitle,
        )
            .accounts({
                mintAuthority: wallet!.publicKey,
                mint: mintKeypair.publicKey,
                tokenAccount: tokenAddress,
                tokenProgram: TOKEN_PROGRAM_ID,
                metadata: metadataAddress,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                payer: wallet!.publicKey,
                masterEdition: masterEditionAddress,

            })
            .signers([mintKeypair])
            .rpc()

    }

    return (
        <div className="App">
            <button onClick={createCollectionNFT}>Create Collection NFT</button>
            <button onClick={soSomething}>Do something</button>
            {/* <button onClick={tests}>Tests</button> */}
            <WalletMultiButton />
        </div>
    );
};

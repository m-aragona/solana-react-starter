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

        const mintKeypair = Keypair.generate();

        console.log('Pub Key MintKeypair', mintKeypair.publicKey.toString())

        const tokenAccount = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            wallet!.publicKey
        );

        console.log('nftTokenAccount', tokenAccount.toString())

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

        // const nftMetadataUri = "https://gateway.pinata.cloud/ipfs/QmWEUir6yEJX5YqLtJ8HXFiBLGhVn5DQ5Qif4sZPtjY6Be/0.json";
        const nftMetadataUri = "https://gateway.pinata.cloud/ipfs/QmWEUir6yEJX5YqLtJ8HXFiBLGhVn5DQ5Qif4sZPtjY6Be/1.json";
        // const nftMetadataUri = "https://gateway.pinata.cloud/ipfs/QmWEUir6yEJX5YqLtJ8HXFiBLGhVn5DQ5Qif4sZPtjY6Be/2.json";
        // const nftMetadataUri = "https://gateway.pinata.cloud/ipfs/QmWEUir6yEJX5YqLtJ8HXFiBLGhVn5DQ5Qif4sZPtjY6Be/3.json";

        const nftTitle = "Solana Collection Test #2"; // Cambiar a 1, 2, 3 , 4 segun corresponda...

        // Modificar por lo que dicen los logs de la coleccion
        const collection_mint = new PublicKey("BrbxJ1gmVRieZPdt2ck55qUF4X48vqopuzQbSxwQYDE3")
        const collection_update_auth = new PublicKey("5ymCqhEd8u8NtnfWnyF1JxoTCfNbhSKJLk5A4mrLase7")
        const collection_metadata_address = new PublicKey("FkiyyMmujN6G1pC4HsYdW7BkcYc1Rv5RT1Xw3LqsEdAk")
        const collection_master_edition = new PublicKey("4KkoJ13mh3WYFqPyoofq5QBpWgs6tq7jUzJWvQJeBrq5")

        const creatorAccount1 = new PublicKey("DRRPmFvafaZs5rc2PDDygrfd9ref2Jv7iYMU3kYmRWPd")

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
                tokenAccount: tokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                metadata: metadataAddress,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                payer: wallet!.publicKey,
                masterEdition: masterEditionAddress,
                collectionUpdateAuth: wallet!.publicKey,
                collectionMint: collection_mint,
                collectionMetadata: collection_metadata_address,
                collectionMasterEd: collection_master_edition,
                creatorAccount1: creatorAccount1,
            })
            .signers([mintKeypair])
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

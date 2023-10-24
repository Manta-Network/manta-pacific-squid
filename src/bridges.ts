import { ZeroAddress, isZeroAddress } from './utils';

export const SupportBridges = [
  "Polyhedra",
  "Orbiter",
  "MiniBridge",
  "LayerSwap",
  "Owlto",
  "Meson",
  "RhinoFi",
  "DappOS",
  "Native",
] as const;

export const SupportErc20TokenBridges = [
  "Owlto",
  "RhinoFi",
  "DappOS",
  "Native",
  "Meson",
  "LayerSwap",
];

export type BridgeType = (typeof SupportBridges)[number];


export type BridgeEventFormatResult = {
  account: string;
  amount: string;
  token: string;
};

export type BridgeEventType = {
  bridge: BridgeType;
  address: string;
  firstTopic: string;
  abi: string[];
  abiCoder: string;
  isNFT?: boolean;
  formatData: (tx: any) => BridgeEventFormatResult;
};

export const EventConfig: Record<
  Extract<
    BridgeType,
    "Polyhedra" | "DappOS" | "RhinoFi" | "Native" | "Orbiter"
  >,
  BridgeEventType
> = {
  Polyhedra: {
    bridge: "Polyhedra",
    address: "0xCE0e4e4D2Dc0033cE2dbc35855251F4F3D086D0A",
    firstTopic:
      "0x32aae95950c2e1f2c1a419165ba01c63c49604db10ee1b95d9960c0f5b9b9fa8",
    abi: ["address", "address", "uint256", "uint16", "uint16", "address"],
    // 'event ReceiveNFT(uint64 indexed nonce, address sourceToken, address token, uint256 tokenID, uint16 sourceChain, uint16 sendChain, address recipient)',
    abiCoder: `ReceiveNFT(uint64,address,address,uint256,uint16,uint16,address)`,
    isNFT: true,
    formatData: (tx) => {
      return {
        account: tx.data[5],
        token: tx.data[1],
        amount: "1",
      };
    },
  },
  DappOS: {
    bridge: "DappOS",
    address: "0x1350AF2F8E74633816125962F3DB041e620C1037",
    firstTopic:
      "0x035725451e5bd2b60362063dbcdea18faf7d366572f9ab6b817a73a5da53b6a2",
    abi: ["address", "address", "uint256", "address", "uint256", "bytes32"],
    // 'event OrderExecuted(address indexed executor, uint256 indexed payOrderId, address owner, address receiver, uint256 amountOut, address tokenOut, uint256 code, bytes32 wfHash)'
    abiCoder: `OrderExecuted(address,uint256,address,address,uint256,address,uint256,bytes32)`,
    formatData: (tx) => {
      return {
        account: tx.data[0],
        token: tx.data[3],
        amount: tx.data[2],
      };
    },
  },
  RhinoFi: {
    bridge: "RhinoFi",
    address: "0x2B4553122D960CA98075028d68735cC6b15DeEB5",
    firstTopic:
      "0xe4f4f1fb3534fe80225d336f6e5a73007dc992e5f6740152bf13ed2a08f3851a",
    abi: ["uint256", "string"],
    // 'event BridgedWithdrawal(address indexed user, address indexed token, uint256 amount, string withdrawalId)'
    abiCoder: `BridgedWithdrawal(address,address,uint256,string)`,
    formatData: (tx) => {
      return {
        account: `0x${tx.second_topic.slice(-40)}`,
        token: `0x${tx.third_topic.slice(-40)}`,
        amount: tx.data[0],
      };
    },
  },
  Native: {
    bridge: "Native",
    address: "0x4200000000000000000000000000000000000010",
    firstTopic:
      "0xb0444523268717a02698be47d0803aa7468c00acbed2f8bd93a0459cde61dd89",
    abi: ["address", "uint256", "bytes"],
    // 'event DepositFinalized(address indexed arg0, address indexed arg1, address indexed arg2, address arg3, uint256 arg4, bytes arg5)'
    abiCoder: `DepositFinalized(address,address,address,address,uint256,bytes)`,
    formatData: (tx) => {
      const l1TokenAddress = `0x${tx.second_topic.slice(-40)}`;
      const l2TokenAddress = `0x${tx.third_topic.slice(-40)}`;
      return {
        account: `0x${tx.fourth_topic.slice(-40)}`,
        token: isZeroAddress(l1TokenAddress) ? l1TokenAddress : l2TokenAddress,
        amount: tx.data[1],
      };
    },
  },
  Orbiter: {
    bridge: "Orbiter",
    address: "0x13E46b2a3f8512eD4682a8Fb8B560589fE3C2172",
    firstTopic:
      "0x69ca02dd4edd7bf0a4abb9ed3b7af3f14778db5d61921c7dc7cd545266326de2",
    abi: ["uint256"],
    // Transfer(address indexed to, uint256 amount)
    abiCoder: `Transfer(address,amount)`,
    formatData: (tx) => {
      return {
        account: `0x${tx.second_topic.slice(-40)}`,
        token: ZeroAddress,
        amount: tx.data[0],
      };
    },
  },
};

export const bridgeEventAddresses = Object.values(EventConfig).map((x) => x.address);
export const bridgeTopics = Object.values(EventConfig).map((x) => x.firstTopic);

import Enquirer from 'enquirer';
import { Command, DefinitionSubcommand, GenSubcommand, InterfacesSubcommand, LocalEVMSubcommand } from './commands.js';

interface Answer {
  answer: string
}

interface Choice {
  name: string
  message?: string
  value?: unknown
  hint?: string
  role?: string
  enabled?: boolean
  disabled?: boolean | string
}

interface PromptOptions {
  message: string
  prefix?: string
}

interface InputPromptOptions extends PromptOptions {
  initial?: string
}

interface SelectPromptOptions extends PromptOptions {
  choices: (string | Choice)[]
  initial?: number
}

interface ConfirmPromptOptions extends PromptOptions {
  initial?: boolean
}

export class CLI {
  static input = async (options: InputPromptOptions) => {
    const response: Answer = await Enquirer.prompt({
      type: 'input',
      name: 'answer',
      message: options.message,
      initial: options.initial,
    });
    return response.answer;
  }

  static select  = async (options: SelectPromptOptions) => {
    const response: Answer = await Enquirer.prompt({
      type: 'select',
      name: 'answer',
      initial: options.initial,
      message: options.message,
      choices: options.choices,
    });
    return response.answer;
  }

  static confirm  = async (options: ConfirmPromptOptions) => {
    const response: Answer = await Enquirer.prompt({
      type: 'confirm',
      name: 'answer',
      message: options.message,
      initial: options.initial,
    });
    return response.answer;
  }

  static yesNo = async (message: string, initialYes: boolean = false) => {
    const choices: Choice[] = [
      { name: 'no',       message: 'No' },
      { name: 'yes',      message: 'Yes' },
    ];
    const response = await this.select({
      message,
      prefix:  '?',
      choices: initialYes ? choices.reverse() : choices,
    });
    return response === 'yes';
  }

  static firstQuestion = async () => {
    console.log("\n\u001b[33mWelcome to Distributed Interfaces CLI v1.0.0\n");
    const response = await this.select({
      message: 'What do you want to do?',
      prefix:  '?',
      choices: [
        { name: 'init',       message: 'Initialize config file' },
        { name: 'build',      message: 'Build schema' },
        { name: 'interfaces', message: 'Interfaces' },
        { name: 'definition', message: 'Definition file' },
        { name: 'gen',        message: 'Generate API code' },
        { name: 'local_evm',  message: 'Local EVM' },
        { name: 'quit',       message: 'Quit', },
      ],
    });
    return response as Command;
  }

  static confirmConfigFileReplacement = async () => {
    const response = await this.yesNo(
      'Config file already exists.\nDo you want to replace it?',
    );
    return !!response;
  }

  static interfacesSubcommand = async () => {
    const response = await this.select({
      message: 'Please, select an action:',
      prefix:  '?',
      choices: [
        // { name: 'get-config',  message: 'Get remote interfaces of config file' },
        { name: 'get',      message: 'Get all interfaces of definition file' },
        { name: 'send',     message: 'Send built interfaces to remote' },
        { name: 'register', message: 'Register built interfaces on the blockchain' },
        { name: 'versions', message: 'Get the hashes of all versions of a interface' },
        { name: 'user',     message: 'Get the all interface hashes of a user' },
        { name: 'state',    message: 'Get a interface state on the blockchain' },
      ],
    });
    return response as InterfacesSubcommand;
  }

  static interfacesInterfaceName = async () => {
    const response = await this.input({
      message: 'What is the interface name?',
      prefix:  '?',
    });
    return response;
  }

  static creatorUserAddress = async () => {
    const response = await this.input({
      message: 'What is the creator user address?',
      prefix:  '?',
    });
    return response;
  }

  static interfaceHash = async () => {
    const response = await this.input({
      message: 'What is the interface hash?',
      prefix:  '?',
    });
    return response;
  }

  static definitionSubcommand = async () => {
    const response = await this.select({
      message: 'Please, select an action:',
      prefix:  '?',
      choices: [
        { name: 'start',    message: 'Start definition file' },
        { name: 'get',      message: 'Get definition file from remote' },
        { name: 'send',     message: 'Send definition file to remote' },
        { name: 'register', message: 'Register definition file on the blockchain' },
        { name: 'user',     message: 'Get the all definition hashes of a user' },
        { name: 'state',    message: 'Get a definition state on the blockchain' },
      ],
    });
    return response as DefinitionSubcommand;
  }

  static definitionRegisterActive = async () => {
    const response = await this.yesNo('Register Definition as active?', true);
    return response;
  }

  static definitionHash = async () => {
    const response = await this.input({
      message: 'What is the definition hash?',
      prefix:  '?',
    });
    return response;
  }

  static confirmDefinitionFileReplacement = async () => {
    const response = await this.yesNo(
      'Definition file already exists.\nDo you want to replace it?',
    );
    return !!response;
  }

  static localEvmSubcommand = async () => {
    const response = await this.select({
      message: 'Please, select an action:',
      prefix:  '?',
      choices: [
        { name: 'compile', message: 'Compile smart contracts with hardhat' },
        { name: 'run',     message: 'Run Local EVM (hardhat network)' },
        { name: 'deploy',  message: 'Deploy smart contracts to Local EVM' },
      ],
    });
    return response as LocalEVMSubcommand;
  }

  static genSubcommand = async () => {
    const response = await this.select({
      message: 'Please, select the language:',
      prefix:  '?',
      choices: [
        { name: 'golang', message: 'Golang' },
      ],
    });
    return response as GenSubcommand;
  }

}

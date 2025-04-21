const mongoose = require('mongoose');
const { OpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const { MongoDBAtlasVectorSearch } = require('@langchain/mongodb');
const fsPromises = require('fs').promises;
const { secureKey, verifyKey } = require('../utils/secretKey');

const express = require("express");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { ChatOpenAI } = require("@langchain/openai");
const { MongoClient, ObjectId } = require("mongodb");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const {
  RunnablePassthrough,
  RunnableSequence,
} = require("@langchain/core/runnables");
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { formatConvHistory } = require("./utils/formatConvHistory.js");

const uri = process.env.VITE_MONGODB_ATLAS_URI;
const client = new MongoClient(uri);

const saveChatInstance = async (req, res) => {
  try {
    await client.connect();
    const db = client.db(process.env.VITE_MONGODB_ATLAS_DB_NAME);
    const instances = db.collection("instances");

    const newInstance = {
      name: req.body.name || `Chat${Date.now()}`,
      createdAt: new Date(),
      documentName: null,
    };

    const result = await instances.insertOne(newInstance);
    res.json({ success: true, instanceId: result.insertedId });

  } catch (error) {
    res.status(500).json({ message: 'Error saving chat instance' });
  }
};

const getAllInstances = async (req, res) => {
    try {
        await client.connect();
        const db = client.db(process.env.VITE_MONGODB_ATLAS_DB_NAME);
        const instances = db.collection("instances");
        const allInstances = await instances.find({}).toArray();
        res.json({ success: true, instances: allInstances });
    } catch (error) {
        res.status(500).json({ 
          success: false,
          instances: [],
          message: 'Error fetching chat instances' });
    }
};

const getChatInstance = async (req, res) => {
    try {
        console.log("params", req.params)
        await client.connect();
        const db = client.db(process.env.VITE_MONGODB_ATLAS_DB_NAME);
        const instances = db.collection("instances");
        const chatHistory = db.collection("chatHistory");
    
        const instance = await instances.findOne({
          _id: new ObjectId(req.params.id),
        });
        if (!instance) {
          return res
            .status(404)
            .json({ success: false, error: "Instance not found" });
        }
    
        // Get chat history for this instance
        const messages = await chatHistory
          .find({ instanceId: req.params.id })
          .sort({ timestamp: 1 })
          .toArray();

          
    
        res.json({ 
          success: true, 
          instance: {
            ...instance,
            messages
          }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat instance',error: error });
    }
};

    const deleteChatInstance = async (req, res) => {
    try {
        // Check if the ID is valid
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid instance ID format' 
          });
        }
    
        await client.connect();
        const db = client.db(process.env.VITE_MONGODB_ATLAS_DB_NAME);
        const instances = db.collection("instances");
        const chatHistory = db.collection("chatHistory");
        const vectorStore = db.collection("vectorStore");
    
        const ObjectId = require('mongodb').ObjectId;
        const instanceId = new ObjectId(req.params.id);
    
        // Delete the instance
        const deleteResult = await instances.deleteOne({ _id: instanceId });
    
        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Instance not found' 
          });
        }
    
        // Delete related data
        await chatHistory.deleteMany({ instanceId: req.params.id });
        await vectorStore.deleteMany({ instanceId: req.params.id });
    
        res.json({ success: true, message: "Instance deleted successfully" });
    } catch (error) {
        console.error('Error in deleteChatInstance:', error);
        res.status(500).json({ 
          message: 'Error deleting chat instance', 
          error: error.message 
        });
    } finally {
        await client.close();
    }
};

const uploadAIFile = async (req, res) => {
    try {
      if (!req.file) {
        throw new Error("No file uploaded");
      }
  
      // Check if the ID is valid
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new Error('Invalid instance ID format');
      }
  
      // Use PDFLoader to load and parse the PDF
      const loader = new PDFLoader(req.file.path);
      const docs = await loader.load();
  
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        separator: ["\n\n", "\n", ""],
        chunkOverlap: 50,
      });
  
      const documents = await textSplitter.splitDocuments(docs);
  
      await client.connect();
      const collection = client
        .db(process.env.VITE_MONGODB_ATLAS_DB_NAME)
        .collection("vectorStore");
  
      const embeddings = new OpenAIEmbeddings({
        modelName: "text-embedding-3-small",
        openAIApiKey: process.env.VITE_OPENAI_API_KEY,
      });
  
      const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection: collection,
        indexName: "vector_index",
        textKey: "text",
        embeddingKey: "embedding",
        filterKey: "metadata.instanceId",
      });
  
      // Add instanceId to each document
      const documentsWithInstance = documents.map((doc) => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          instanceId: req.params.id,
        },
      }));
  
      await vectorStore.addDocuments(documentsWithInstance);
  
      // Update instance with document name
      const instances = client
        .db(process.env.VITE_MONGODB_ATLAS_DB_NAME)
        .collection("instances");
  
      const ObjectId = require('mongodb').ObjectId;
      await instances.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { documentName: req.file.originalname } }
      );
  
      // Clean up the uploaded file
      await fsPromises.unlink(req.file.path);
  
      res.json({ success: true });
    } catch (error) {
      // Clean up the uploaded file in case of error
      if (req.file) {
        try {
          await fsPromises.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError);
        }
      }
      console.error("Error processing PDF:", error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      if (client) {
        await client.close();
      }
    }
};

const getChatHistory = async (req, res) => {
  try {
    await client.connect();
    const db = client.db(process.env.VITE_MONGODB_ATLAS_DB_NAME);
    const chatHistory = db.collection("chatHistory");

    const messages = await chatHistory
      .find({ instanceId: req.params.id })
      .sort({ timestamp: 1 })
      .toArray(); 
      console.log("messages for chat history", messages)  

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Function to get secured OpenAI client
const getSecuredOpenAIClient = async () => {
  try {
    const db = client.db(process.env.VITE_MONGODB_ATLAS_DB_NAME);
    const settings = db.collection("settings");
    
    const apiKeySetting = await settings.findOne({ key: 'openai_api_key' });
    if (!apiKeySetting) {
      // If no key in DB, secure and save the one from env
      const { hash, key } = secureKey(process.env.OPENAI_API_KEY);
      await settings.insertOne({
        key: 'openai_api_key',
        hash: hash,
        createdAt: new Date()
      });
      return new OpenAI({ apiKey: key });
    }
    
    // Verify the current key against stored hash
    if (!verifyKey(process.env.OPENAI_API_KEY, apiKeySetting.hash)) {
      throw new Error('API key verification failed');
    }
    
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (error) {
    console.error('Error getting secured OpenAI client:', error);
    throw error;
  }
};

const chat = async (req, res) => {
  try {
    const { message: question } = req.body;
    const instanceId = req.params.id;

    const openaiClient = await getSecuredOpenAIClient();

    console.log("Chat request:", {
      instanceId,
      question,
      timestamp: new Date().toISOString(),
    });

    if (!question) {
      throw new Error("No question provided");
    }

    console.log("Processing chat for instance:", instanceId);
    console.log("Question:", question);

    await client.connect();

    // Get relevant documents for this instance
    const collection = client
      .db(process.env.VITE_MONGODB_ATLAS_DB_NAME)
      .collection("vectorStore");

    // Store chat history
    const chatHistory = client
      .db(process.env.VITE_MONGODB_ATLAS_DB_NAME)
      .collection("chatHistory");

    //get the chat history for that specific instance
    const convHistory = await chatHistory.find({instanceId: instanceId}).toArray();
    console.log("Chat history:", formatConvHistory(convHistory));

    const embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small",
      openAIApiKey: openaiClient.apiKey,
    });

    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection: collection,
      indexName: "vector_index",
      textKey: "text",
      embeddingKey: "embedding",
      filterKey: "instanceId",
    });

    // Create instance-specific retriever
    const retriever = vectorStore.asRetriever({
      filter: {
        "instanceId": instanceId,
      },
    });
    console.log("Retriever created", retriever);

    const filter = {
      preFilter: {
        instanceId:{
          $eq: instanceId,
        },
      },
    };

    const llm = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      openAIApiKey: openaiClient.apiKey,
      temperature: 0.7,
    });

    const combinedDocuments = (docs) => {
      if (!docs || docs.length === 0) {
        return "No relevant documents found.";
      }
      return docs.map((doc) => doc.pageContent).join("\n\n");
    };

    const standaloneQuestionTemplate = `Given some conversation history (if any) and a question, convert the question to a standalone question. 
conversation history: {conv_history}
question: {question} 
standalone question:`
    const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate)

    const answerTemplate = `You are a helpful and enthusiastic support bot who can answer a given question about Scrimba based on the context provided and the conversation history. Try to find the answer in the context. If the answer is not given in the context, find the answer in the conversation history if possible. If you really don't know the answer, say "I'm sorry, I don't know the answer to that." And direct the questioner to email help@scrimba.com. Don't try to make up an answer. Always speak as if you were chatting to a friend.
context: {context}
conversation history: {conv_history}
question: {question}
answer: `
    const answerPrompt = PromptTemplate.fromTemplate(answerTemplate)

    const standaloneQuestionChain = standaloneQuestionPrompt
        .pipe(llm)
        .pipe(new StringOutputParser())

    const retrieverChain = RunnableSequence.from([
      prevResult => prevResult.standalone_question,
      retriever,
      combinedDocuments
  ])

  const answerChain = answerPrompt
  .pipe(llm)
  .pipe(new StringOutputParser())

  const chain = RunnableSequence.from([
    {
        standalone_question: standaloneQuestionChain,
        original_input: new RunnablePassthrough()
    },
    {
        context: retrieverChain,
        question: ({ original_input }) => original_input.question,
        conv_history: ({ original_input }) => original_input.conv_history
    },
    answerChain
])

const response = await chain.invoke({
  question: question,
  conv_history: convHistory
})

    console.log("Final response:", response);

    await chatHistory.insertOne({
      instanceId,
      message: {
        role: "user",
        content: question,
        timestamp: new Date(),
      },
    });

    await chatHistory.insertOne({
      instanceId,
      message: {
        role: "ai",
        content: response,
        timestamp: new Date(),
      },
    });

    res.json({ success: true, answer: response });
  } catch (error) {
    console.error("Chat error details:", {
      message: error.message,
      stack: error.stack,
      instanceId,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Error processing chat request",
    });
  }
};

module.exports = {
  saveChatInstance,
  getAllInstances,
  getChatInstance,
  deleteChatInstance,
  uploadAIFile,
  getChatHistory,
  chat
};





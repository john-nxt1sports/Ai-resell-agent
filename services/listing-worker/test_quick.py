"""
Quick browser-use test - verify everything works end-to-end.
Uses browser-use's own ChatOpenAI wrapper with OpenRouter.
"""
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

from browser_use import Agent, Browser, ChatOpenAI


async def main():
    print("=" * 50)
    print("  BROWSER-USE QUICK TEST")
    print("=" * 50)

    # 1. Check API key
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("\nOPENROUTER_API_KEY not set in .env")
        return
    print(f"\nOpenRouter API key found ({api_key[:8]}...)")

    # 2. Create LLM using browser-use's own ChatOpenAI
    print("Creating LLM (GPT-4o via OpenRouter)...")
    llm = ChatOpenAI(
        model="gpt-4o",
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
    )

    # 3. Create browser (headless, standalone)
    print("Creating headless browser...")
    browser = Browser(headless=True)

    # 4. Run a simple agent task
    print("Creating agent with simple task...")
    agent = Agent(
        task="Go to https://www.google.com and tell me the page title. That is all.",
        llm=llm,
        browser=browser,
        max_actions_per_step=3,
    )

    print("Running agent...\n")
    try:
        history = await asyncio.wait_for(
            agent.run(max_steps=5),
            timeout=120
        )

        print(f"\n{'=' * 50}")
        print("  RESULT")
        print(f"{'=' * 50}")
        print("Agent completed!")
        print(f"   Steps: {history.number_of_steps()}")
        print(f"   URLs visited: {history.urls()}")

        final = history.final_result()
        if final:
            print(f"   Final result: {final}")

        print(f"   Success: {history.is_successful()}")

    except asyncio.TimeoutError:
        print("Agent timed out after 120s")
    except Exception as e:
        print(f"Agent failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            await browser.close()
        except Exception:
            pass

    print("\nTest complete!")


if __name__ == "__main__":
    asyncio.run(main())
